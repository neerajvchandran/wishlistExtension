import { Router, Request, Response } from 'express';
import { interpretWishlistQuery } from '../services/aiQuery';
import { db } from '../services/supabase';
import { WishlistItem, normalizeCategory } from '@everything-wishlist/shared';

const router = Router();

/**
 * Format wishlist items into clean, emoji-rich WhatsApp markdown text
 */
function formatWhatsAppResponse(
  items: WishlistItem[],
  interpretation: {
    queryType: string;
    searchTerm?: string | null;
    category?: string | null;
    limit?: number | null;
    rawQuery: string;
  }
): string {
  if (items.length === 0) {
    if (interpretation.category) {
      return `🔍 *No items found* in the *${interpretation.category}* category.\n\n_Tip: Capture something new with Ctrl+Shift+S or the browser extension!_`;
    }
    if (interpretation.searchTerm) {
      return `🔍 *No items found* matching "*${interpretation.searchTerm}*" in your wishlist.\n\n_Tip: Try searching for a broader term or brand name._`;
    }
    return `📭 *Your wishlist is currently empty.*\n\n_Use the desktop shortcut (Ctrl+Shift+S) or right-click any webpage to save your first item!_`;
  }

  const lines: string[] = [];

  // Header
  switch (interpretation.queryType) {
    case 'latest':
      lines.push(`✨ *Your Latest Wishlist Item*:`);
      break;
    case 'recent':
      lines.push(`🕒 *Recently Added to Wishlist* (${items.length} items):`);
      break;
    case 'filter_category':
      lines.push(`📂 *Wishlist Items in "${interpretation.category}"* (${items.length} items):`);
      break;
    case 'search':
      lines.push(`🔍 *Search Results for "${interpretation.searchTerm}"* (${items.length} items):`);
      break;
    default:
      lines.push(`📋 *Your Wishlist* (${items.length} items):`);
  }

  lines.push(''); // blank line

  // List each item
  items.forEach((item, index) => {
    const num = items.length > 1 ? `${index + 1}. ` : '';
    lines.push(`${num}*${item.title}*`);

    // Category + Price
    const catStr = item.subcategory ? `${item.category} › ${item.subcategory}` : item.category;
    const priceStr = item.price ? ` | 💰 *${item.price}*` : '';
    lines.push(`   🏷️ ${catStr}${priceStr}`);

    // Intent tag
    if (item.intent) {
      const intentEmoji: Record<string, string> = {
        buy: '🛍️ Buy',
        gift: '🎁 Gift',
        research: '🔬 Research',
        try: '🧪 Try',
        watch: '🎬 Watch',
        read: '📖 Read',
        eat: '🍴 Eat',
        visit: '✈️ Visit',
        other: '📌 Note'
      };
      lines.push(`   💡 ${intentEmoji[item.intent] || item.intent}`);
    }

    // User note if present
    if (item.user_prompt) {
      lines.push(`   💬 "${item.user_prompt}"`);
    }

    // Source link
    if (item.source_url) {
      lines.push(`   🔗 ${item.source_url}`);
    }

    lines.push(''); // spacing between items
  });

  return lines.join('\n').trim();
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function buildTwiML(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Message>${escapeXml(message)}</Message>\n</Response>`;
}

/**
 * Check if the message is a request to save/add an item vs a query
 */
function isSaveAction(text: string): boolean {
  const trimmed = text.trim();
  if (/https?:\/\/[^\s]+/i.test(trimmed)) return true;
  if (/^(?:save|add|buy|bookmark|remember to buy|wishlist:?)\s+/i.test(trimmed)) return true;
  return false;
}

/**
 * Handle saving an item directly from WhatsApp
 */
async function handleSaveItem(rawMessage: string, userId?: string): Promise<string> {
  const urlMatch = rawMessage.match(/https?:\/\/[^\s]+/i);
  let title = rawMessage;
  let sourceUrl = '';
  let sourceWebsite = '';

  if (urlMatch) {
    sourceUrl = urlMatch[0];
    try {
      const parsedUrl = new URL(sourceUrl);
      sourceWebsite = parsedUrl.hostname.replace(/^www\./, '');
      const promptWithoutUrl = rawMessage.replace(sourceUrl, '').trim();
      title = promptWithoutUrl || `Item from ${sourceWebsite}`;
    } catch {
      title = 'Saved Link';
    }
  } else {
    // Strip leading save/add keywords
    title = rawMessage.replace(/^(?:save|add|buy|bookmark|remember to buy|wishlist:?)\s+/i, '').trim();
  }

  // Determine category & intent
  const categoryHeuristic = normalizeCategory(title);
  const category = categoryHeuristic.category || 'Home & Living';
  const subcategory = '';

  const savedItem = await db.addItem({
    title: title || 'Saved Item',
    description: `Added via WhatsApp: ${rawMessage}`,
    category,
    subcategory,
    intent: 'buy',
    source_url: sourceUrl || undefined,
    source_website: sourceWebsite || undefined,
    user_prompt: rawMessage,
    user_id: userId
  });

  const catDisplay = savedItem.subcategory ? `${savedItem.category} › ${savedItem.subcategory}` : savedItem.category;
  return `✅ *Saved to your Wishlist!*\n\n📌 *${savedItem.title}*\n🏷️ ${catDisplay}\n💡 🛍️ Buy\n${savedItem.source_url ? `🔗 ${savedItem.source_url}\n` : ''}\n_View it in your Everything Wishlist app!_`;
}

/**
 * Main handler for incoming messages from WhatsApp, Twilio, or n8n
 */
async function handleMessage(req: Request, res: Response) {
  try {
    // Extract message from Twilio Body or standard payload fields
    const rawMessage = (
      req.body?.Body ||
      req.body?.message ||
      req.query?.message ||
      req.body?.text ||
      ''
    ).toString().trim();

    const userId = (
      req.body?.userId ||
      req.query?.userId ||
      req.headers['x-user-id'] ||
      undefined
    )?.toString();

    // Check if client expects TwiML XML (Twilio direct webhook)
    const wantsTwiML =
      req.query?.format === 'twiml' ||
      req.headers['accept']?.includes('text/xml') ||
      req.headers['accept']?.includes('application/xml') ||
      (Boolean(req.headers['content-type']?.includes('application/x-www-form-urlencoded')) && Boolean(req.body?.Body));

    let whatsappMessage = '';
    let actionType: 'query' | 'save' = 'query';
    let queryInterpretation: any = null;
    let queryItems: WishlistItem[] = [];

    if (!rawMessage) {
      whatsappMessage = `👋 *Welcome to Everything Wishlist!*\n\n• Ask: *"Show my latest item"*\n• Ask: *"What books do I have?"*\n• Ask: *"Show my wishlist"*\n• Or send a link / *"Save [product]"* to add it!`;
    } else if (isSaveAction(rawMessage)) {
      // User wants to save a new item
      actionType = 'save';
      whatsappMessage = await handleSaveItem(rawMessage, userId);
    } else {
      // User is querying their wishlist
      actionType = 'query';
      queryInterpretation = await interpretWishlistQuery(rawMessage);
      queryItems = await db.queryItems(queryInterpretation, userId);
      whatsappMessage = formatWhatsAppResponse(queryItems, queryInterpretation);
    }

    const twimlXml = buildTwiML(whatsappMessage);

    // If client requested XML (e.g. Twilio direct webhook), return TwiML XML
    if (wantsTwiML) {
      res.setHeader('Content-Type', 'text/xml; charset=utf-8');
      return res.send(twimlXml);
    }

    // Default: return structured JSON for n8n
    return res.json({
      success: true,
      action: actionType,
      query: rawMessage,
      whatsapp_message: whatsappMessage,
      twiml_xml: twimlXml,
      interpretation: queryInterpretation,
      count: queryItems.length,
      items: queryItems.map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        subcategory: item.subcategory,
        intent: item.intent,
        price: item.price,
        image_url: item.image_url,
        source_url: item.source_url,
        source_website: item.source_website,
        user_prompt: item.user_prompt,
        date_added: item.date_added
      }))
    });
  } catch (err: any) {
    console.error('[WhatsApp Route Error]', err);
    const errorMsg = '⚠️ Sorry, an error occurred while processing your wishlist message. Please try again.';
    const twimlXml = buildTwiML(errorMsg);

    if (req.query?.format === 'twiml' || req.headers['accept']?.includes('xml')) {
      res.setHeader('Content-Type', 'text/xml; charset=utf-8');
      return res.status(500).send(twimlXml);
    }

    return res.status(500).json({
      success: false,
      error: err.message || 'Error processing wishlist query',
      whatsapp_message: errorMsg,
      twiml_xml: twimlXml
    });
  }
}

// Support both POST and GET for all endpoints
router.post('/query', handleMessage);
router.get('/query', handleMessage);
router.post('/message', handleMessage);
router.get('/message', handleMessage);
router.post('/webhook', handleMessage);
router.get('/webhook', handleMessage);

// Health check / webhook verification
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'everything-wishlist-whatsapp-api',
    endpoints: {
      postMessage: '/api/whatsapp/message',
      postQuery: '/api/whatsapp/query',
      directWebhook: '/api/whatsapp/webhook?format=twiml'
    }
  });
});

export default router;

import OpenAI from 'openai';
import {
  StructuredAIOutput,
  StructuredAIOutputSchema,
  normalizeCategory,
  IntentType
} from '@everything-wishlist/shared';

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || 'gpt-4o';

let openaiClient: OpenAI | null = null;
if (apiKey && !apiKey.includes('your_openai_api_key')) {
  openaiClient = new OpenAI({ apiKey });
  console.log(`[OpenAI] Initialized client with model ${model}`);
} else {
  console.log('[OpenAI] No valid API key found. Operating in heuristic & smart mock mode.');
}

const JSON_SCHEMA_OUTPUT = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'Precise name or title of the identified item, product, book, movie, place, or concept'
    },
    description: {
      type: 'string',
      description: 'Clear 1-2 sentence summary of what this item is, key features or context'
    },
    category: {
      type: 'string',
      description: 'Standard canonical category (e.g. Fashion, Books, Movies & Shows, Electronics & Tech, Home & Living, Food & Dining, Travel & Places, Gaming & Toys, Health & Beauty, Research & Ideas)'
    },
    subcategory: {
      type: 'string',
      description: 'Specific subcategory (e.g. Shoes, Smartphones, Self-Help, Sci-Fi, Coffee, Board Games, Furniture)'
    },
    intent: {
      type: 'string',
      enum: ['buy', 'gift', 'research', 'try', 'watch', 'read', 'eat', 'visit', 'other'],
      description: 'User intent deduced from visual cues or user notes'
    },
    price: {
      type: ['string', 'null'],
      description: 'Detected price string (e.g. "$120", "€45") or null if none'
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Relevant search tags'
    },
    metadata: {
      type: 'object',
      description: 'Key-value pairs of extracted details (brand, author, rating, etc.)',
      additionalProperties: true
    }
  },
  required: ['title', 'description', 'category', 'subcategory', 'intent', 'price', 'tags'],
  additionalProperties: false
};

function deduceIntentFromPrompt(prompt?: string): IntentType {
  if (!prompt) return 'buy';
  const lower = prompt.toLowerCase();
  if (lower.includes('gift')) return 'gift';
  if (lower.includes('research') || lower.includes('look into') || lower.includes('study')) return 'research';
  if (lower.includes('watch') || lower.includes('movie') || lower.includes('series')) return 'watch';
  if (lower.includes('read') || lower.includes('book')) return 'read';
  if (lower.includes('eat') || lower.includes('dine') || lower.includes('taste') || lower.includes('restaurant')) return 'eat';
  if (lower.includes('visit') || lower.includes('travel') || lower.includes('trip')) return 'visit';
  if (lower.includes('try')) return 'try';
  if (lower.includes('buy') || lower.includes('purchase') || lower.includes('get')) return 'buy';
  return 'other';
}

export async function analyzeScreenshot(
  imageBase64: string,
  userPrompt?: string
): Promise<StructuredAIOutput> {
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  if (openaiClient) {
    try {
      const response = await openaiClient.chat.completions.create({
        model: model,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'WishlistItemExtraction',
            strict: false,
            schema: JSON_SCHEMA_OUTPUT as any
          }
        },
        messages: [
          {
            role: 'system',
            content: `You are an expert AI wishlist assistant. Your job is to analyze captured screenshots and user context to identify exactly what the item is and categorize it cleanly.
Normalize categories strictly into standard canonical forms (e.g., clothes/sneakers -> Fashion, books -> Books, games/lego -> Gaming & Toys, movies -> Movies & Shows).
If user prompt mentions "Gift for cousin", "Buy this", "Want to try", adjust intent and description accordingly.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt
                  ? `Identify this item from the captured image. The user added this context: "${userPrompt}".`
                  : 'Identify this item from the captured image and extract its title, category, subcategory, estimated or shown price, description, and tags.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${cleanBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      });

      const rawJson = response.choices[0]?.message?.content;
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        const validated = StructuredAIOutputSchema.parse(parsed);
        const { category: normalizedCat } = normalizeCategory(validated.category);
        return {
          ...validated,
          category: normalizedCat,
          intent: userPrompt ? deduceIntentFromPrompt(userPrompt) : validated.intent
        };
      }
    } catch (err) {
      console.error('[OpenAI Vision] Error calling OpenAI API:', err);
    }
  }

  // Smart Heuristic Fallback when no API key or on API failure
  const deducedIntent = deduceIntentFromPrompt(userPrompt);
  let title = 'Captured Wishlist Item';
  let category = 'Other';
  let subcategory = 'General';
  let desc = userPrompt ? `Captured with note: "${userPrompt}"` : 'Captured from desktop screen.';

  if (userPrompt) {
    const p = userPrompt.toLowerCase();
    if (p.includes('shoe') || p.includes('sneaker') || p.includes('jacket') || p.includes('shirt') || p.includes('wear')) {
      category = 'Fashion';
      subcategory = p.includes('shoe') || p.includes('sneaker') ? 'Shoes' : 'Apparel';
      title = userPrompt;
    } else if (p.includes('book') || p.includes('read')) {
      category = 'Books';
      subcategory = 'Non-Fiction';
      title = userPrompt;
    } else if (p.includes('movie') || p.includes('watch') || p.includes('film')) {
      category = 'Movies & Shows';
      subcategory = 'Movies';
      title = userPrompt;
    } else if (p.includes('lego') || p.includes('game') || p.includes('play')) {
      category = 'Gaming & Toys';
      subcategory = 'Toys & Collectibles';
      title = userPrompt;
    } else {
      title = userPrompt;
    }
  }

  const normalized = normalizeCategory(category).category;

  return {
    title: title,
    description: desc,
    category: normalized,
    subcategory: subcategory,
    intent: deducedIntent,
    price: null,
    tags: [normalized.toLowerCase(), deducedIntent],
    metadata: { source: 'desktop_capture', user_note: userPrompt }
  };
}

export async function analyzeWebpage(
  webData: {
    url: string;
    title: string;
    website?: string;
    ogData?: any;
    jsonLd?: any;
    selectedText?: string;
    imageUrl?: string;
    price?: string;
    userPrompt?: string;
  }
): Promise<StructuredAIOutput> {
  const deducedIntent = deduceIntentFromPrompt(webData.userPrompt);

  if (openaiClient) {
    try {
      const response = await openaiClient.chat.completions.create({
        model: model,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'WebWishlistItemExtraction',
            strict: false,
            schema: JSON_SCHEMA_OUTPUT as any
          }
        },
        messages: [
          {
            role: 'system',
            content: `You are an expert AI wishlist extractor. You receive extracted webpage data (title, URL, website, OpenGraph, JSON-LD, prices, selected text, user prompt).
Deduce the true product/item name, canonical category, specific subcategory, intent, clean price, short description, and tags.
Normalize categories (e.g., fashion, electronics, books, movies, dining, toys, etc.).`
          },
          {
            role: 'user',
            content: `Analyze this webpage extraction:
URL: ${webData.url}
Title: ${webData.title}
Website: ${webData.website || 'Unknown'}
Extracted Price: ${webData.price || 'None'}
Selected Text: ${webData.selectedText || 'None'}
User Notes: ${webData.userPrompt || 'None'}
OG Data: ${JSON.stringify(webData.ogData || {})}
JSON-LD: ${JSON.stringify(webData.jsonLd || {})}`
          }
        ],
        max_tokens: 800
      });

      const rawJson = response.choices[0]?.message?.content;
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        const validated = StructuredAIOutputSchema.parse(parsed);
        const { category: normalizedCat } = normalizeCategory(validated.category);
        return {
          ...validated,
          category: normalizedCat,
          intent: webData.userPrompt ? deducedIntent : validated.intent
        };
      }
    } catch (err) {
      console.error('[OpenAI Web] Error calling OpenAI API:', err);
    }
  }

  // Fallback heuristic for web analysis
  let category = 'Other';
  let subcategory = 'Web Item';
  let detectedPrice = webData.price || (webData.ogData && webData.ogData.price) || null;
  let title = webData.title || 'Saved Web Item';

  // Basic cleanup of website title noise (e.g. "Nike Vomero 5 - Official Nike Store")
  if (title.includes(' | ')) {
    title = title.split(' | ')[0];
  } else if (title.includes(' - ')) {
    title = title.split(' - ')[0];
  }

  const lowerUrl = webData.url.toLowerCase();
  const lowerTitle = title.toLowerCase();

  if (lowerUrl.includes('nike') || lowerUrl.includes('zara') || lowerTitle.includes('shoe') || lowerTitle.includes('shirt')) {
    category = 'Fashion';
    subcategory = lowerTitle.includes('shoe') ? 'Shoes' : 'Apparel';
  } else if (lowerUrl.includes('amazon') || lowerUrl.includes('apple') || lowerTitle.includes('pro') || lowerTitle.includes('phone')) {
    category = 'Electronics & Tech';
    subcategory = 'Gadgets';
  } else if (lowerUrl.includes('goodreads') || lowerTitle.includes('book') || lowerTitle.includes('novel')) {
    category = 'Books';
    subcategory = 'Reading';
  } else if (lowerUrl.includes('imdb') || lowerUrl.includes('netflix') || lowerTitle.includes('movie')) {
    category = 'Movies & Shows';
    subcategory = 'Movies';
  }

  const normalized = normalizeCategory(category).category;

  return {
    title: title.trim(),
    description: (webData.ogData && webData.ogData.description) || webData.selectedText || `Saved from ${webData.website || 'the web'}.`,
    category: normalized,
    subcategory: subcategory,
    intent: deducedIntent,
    price: detectedPrice,
    tags: [normalized.toLowerCase(), (webData.website || '').toLowerCase()].filter(Boolean),
    metadata: {
      source_website: webData.website,
      source_url: webData.url,
      user_prompt: webData.userPrompt
    }
  };
}

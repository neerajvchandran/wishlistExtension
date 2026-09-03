import OpenAI from 'openai';
import {
  StructuredAIOutput,
  StructuredAIOutputSchema,
  normalizeCategory,
  IntentType
} from '@everything-wishlist/shared';

// Environment variables with smart Ollama defaults
const provider = process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your_openai') ? 'openai' : 'ollama');
const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
const model = process.env.OLLAMA_MODEL || process.env.OPENAI_MODEL || (provider === 'ollama' ? 'qwen2.5vl:7b' : 'gpt-4o');

let openaiClient: OpenAI | null = null;
const isOllama = provider === 'ollama' || ollamaBaseUrl.includes('11434');

if (isOllama) {
  openaiClient = new OpenAI({
    baseURL: ollamaBaseUrl,
    apiKey: 'ollama' // Dummy key required by OpenAI client
  });
  console.log(`[AI Service] Connected to Ollama at ${ollamaBaseUrl} using model: ${model}`);
} else if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your_openai_api_key')) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log(`[AI Service] Connected to OpenAI using model: ${model}`);
} else {
  // Try local Ollama by default
  openaiClient = new OpenAI({
    baseURL: 'http://localhost:11434/v1',
    apiKey: 'ollama'
  });
  console.log(`[AI Service] Defaulting to local Ollama (http://localhost:11434/v1) with model: ${model}`);
}

const JSON_PROMPT_INSTRUCTIONS = `
You MUST return ONLY a valid, single JSON object with this exact structure:
{
  "title": "Precise product, book, movie, place or item name",
  "description": "Short 1-2 sentence description",
  "category": "Standard canonical category (e.g. Fashion, Books, Movies & Shows, Electronics & Tech, Home & Living, Food & Dining, Travel & Places, Gaming & Toys, Health & Beauty, Research & Ideas)",
  "subcategory": "Specific subcategory (e.g. Shoes, Smartphones, Fiction, Action, Coffee, Board Games, Furniture)",
  "intent": "One of: buy, gift, research, try, watch, read, eat, visit, other",
  "intent_reasoning": "Short 1-sentence reasoning of why AI chose this intent and category",
  "suggested_comment": "Smart default comment based on image/page state, e.g. 'Watch this', 'Read this', 'Wait till stock gets back or look at local retailers', 'Buy this'",
  "bullet_points": ["Concise bullet point 1", "Concise bullet point 2"],
  "price": "$160 or null if not applicable or found",
  "tags": ["tag1", "tag2"]
}
`;

function extractAndParseJson(text: string): any {
  if (!text) throw new Error('Empty response');

  // Strip markdown ```json ... ``` code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {}

  // Regex search for outer curly braces
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }

  throw new Error(`Unable to extract JSON from model output: ${text.substring(0, 150)}...`);
}

async function queryAI(systemPrompt: string, userPrompt: string, timeoutMs = 8000): Promise<any> {
  const isOllama = !process.env.OPENAI_API_KEY || process.env.OLLAMA_BASE_URL || !openaiClient;
  const ollamaUrl = process.env.OLLAMA_BASE_URL
    ? process.env.OLLAMA_BASE_URL.replace(/\/v1\/?$/, '')
    : 'http://localhost:11434';

  if (isOllama) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          format: 'json',
          stream: false
        }),
        signal: controller.signal
      });
      clearTimeout(timer);
      const data: any = await res.json();
      if (data?.message?.content) {
        return extractAndParseJson(data.message.content);
      }
    } catch (e: any) {
      clearTimeout(timer);
      console.warn(`[Ollama Chat] Native chat failed/timed out (${timeoutMs}ms):`, e.message);
    }
  } else if (openaiClient) {
    try {
      const response = await openaiClient.chat.completions.create({
        model: model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 800
      });
      const raw = response.choices[0]?.message?.content;
      if (raw) return extractAndParseJson(raw);
    } catch (e: any) {
      console.warn('[OpenAI Chat] Chat completion failed:', e.message);
    }
  }
  return null;
}

export function summarizeToBulletPoints(text?: string): string[] {
  if (!text || !text.trim()) return [];

  const raw = text.trim();
  // If already bulleted with dashes or bullets
  const lines = raw.split(/\r?\n/).map(l => l.replace(/^[-*•\d.]\s*/, '').trim()).filter(Boolean);
  if (lines.length > 1) {
    return lines.slice(0, 5);
  }

  // Split by sentences or semicolons if long
  const sentences = raw
    .split(/(?<=[.?!;])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length > 1) {
    return sentences.map(s => s.replace(/[.]+$/, '').trim()).filter(Boolean).slice(0, 4);
  }

  // If it's a long clause (> 80 chars), split by conjunctions or commas
  if (raw.length > 80 && raw.includes(',')) {
    const parts = raw.split(/,\s*(?:and\s+)?/).map(p => p.trim()).filter(p => p.length > 5);
    if (parts.length > 1) {
      return parts.slice(0, 4);
    }
  }

  return [raw];
}

export function deduceIntentAndDefaults(context: {
  text?: string;
  url?: string;
  website?: string;
  title?: string;
  isOutOfStock?: boolean;
  stockReason?: string;
  genre?: string;
  breadcrumbs?: string[];
  keywords?: string[];
  snippet?: string;
  screenText?: string;
}): { intent: IntentType; intent_reasoning: string; suggested_comment: string } {
  const rawTitle = context.title || '';
  const cleanTitle = rawTitle.replace(/\s*[-|–]\s*.*$/, '').trim();
  const breadcrumbsText = (context.breadcrumbs || []).join(' ');
  const keywordsText = (context.keywords || []).join(' ');

  const combined = `${context.text || ''} ${rawTitle} ${context.url || ''} ${context.website || ''} ${context.genre || ''} ${context.snippet || ''} ${context.screenText || ''} ${breadcrumbsText} ${keywordsText}`.toLowerCase();

  // 1. Out of stock check
  const isOutOfStock =
    context.isOutOfStock ||
    (context.stockReason && /out of stock|sold out|unavailable/i.test(context.stockReason)) ||
    combined.includes('out of stock') ||
    combined.includes('sold out') ||
    combined.includes('currently unavailable') ||
    combined.includes('back in stock soon') ||
    combined.includes('item is unavailable') ||
    combined.includes("we don't know when or if this item will be back in stock");

  if (isOutOfStock) {
    return {
      intent: 'buy',
      intent_reasoning: 'Detected as currently out of stock or unavailable.',
      suggested_comment: 'Wait till stock is back or look up at local store'
    };
  }

  // 2. Specific website genres (Movie reviews, Crime stories, Educational guides, etc.)
  const genre = context.genre || '';
  if (genre === 'movie review' || combined.includes('movie review') || combined.includes('film review')) {
    return {
      intent: 'read',
      intent_reasoning: 'Identified movie review and film critique article.',
      suggested_comment: cleanTitle ? `Read this movie review: "${cleanTitle}"` : 'Read this movie review'
    };
  }

  if (genre === 'crime story' || combined.includes('crime story') || combined.includes('true crime') || (combined.includes('crime') && combined.includes('story'))) {
    return {
      intent: 'read',
      intent_reasoning: 'Identified crime story, investigation, or mystery report.',
      suggested_comment: cleanTitle ? `Read this crime story: "${cleanTitle}"` : 'Read this crime story'
    };
  }

  if (
    genre === 'educational guide' ||
    combined.includes('educational') ||
    combined.includes('tutorial') ||
    combined.includes('how to ') ||
    combined.includes('guide to') ||
    (context.website && context.website.endsWith('.edu'))
  ) {
    return {
      intent: 'read',
      intent_reasoning: 'Identified educational guide, tutorial, or learning material.',
      suggested_comment: cleanTitle ? `Read this educational guide: "${cleanTitle}"` : 'Read this educational guide'
    };
  }

  if (genre === 'tech article' || combined.includes('tech article') || combined.includes('programming') || combined.includes('software engineering')) {
    return {
      intent: 'read',
      intent_reasoning: 'Identified technology or software engineering article.',
      suggested_comment: cleanTitle ? `Read this tech article: "${cleanTitle}"` : 'Read this tech article'
    };
  }

  if (genre === 'research paper' || combined.includes('research paper') || combined.includes('arxiv') || combined.includes('scientific study')) {
    return {
      intent: 'research',
      intent_reasoning: 'Identified scientific study or research publication.',
      suggested_comment: cleanTitle ? `Read this research paper: "${cleanTitle}"` : 'Read this research paper'
    };
  }

  if (genre === 'book review' || combined.includes('book review') || combined.includes('novel review')) {
    return {
      intent: 'read',
      intent_reasoning: 'Identified book review and literary analysis.',
      suggested_comment: cleanTitle ? `Read this book review: "${cleanTitle}"` : 'Read this book review'
    };
  }

  if (genre === 'recipe' || combined.includes('recipe') || combined.includes('cook time') || combined.includes('ingredients')) {
    return {
      intent: 'try',
      intent_reasoning: 'Identified cooking recipe or culinary instructions.',
      suggested_comment: cleanTitle ? `Try this recipe: "${cleanTitle}"` : 'Try this recipe'
    };
  }

  if (genre === 'news report' || combined.includes('news report') || combined.includes('breaking news')) {
    return {
      intent: 'read',
      intent_reasoning: 'Identified news report or current affairs article.',
      suggested_comment: cleanTitle ? `Read this news report: "${cleanTitle}"` : 'Read this news report'
    };
  }

  if (genre === 'travel guide' || combined.includes('travel guide') || combined.includes('trip itinerary')) {
    return {
      intent: 'visit',
      intent_reasoning: 'Identified travel destination or sightseeing itinerary.',
      suggested_comment: cleanTitle ? `Explore this travel guide: "${cleanTitle}"` : 'Explore this travel guide'
    };
  }

  // 3. Movies / Shows / Video streaming (Amazon Prime, Netflix, etc.)
  if (
    combined.includes('prime video') ||
    combined.includes('primevideo') ||
    combined.includes('amazon prime') ||
    combined.includes('netflix') ||
    combined.includes('hulu') ||
    combined.includes('disney+') ||
    combined.includes('disney') ||
    combined.includes('imdb.com') ||
    combined.includes('imdb') ||
    combined.includes('rottentomatoes') ||
    combined.includes('tv series') ||
    combined.includes('season ') ||
    combined.includes('episode') ||
    combined.includes('streaming') ||
    combined.includes('/video/') ||
    combined.includes('watch')
  ) {
    return {
      intent: 'watch',
      intent_reasoning: 'Identified movie or streaming video title.',
      suggested_comment: cleanTitle ? `Watch this: "${cleanTitle}"` : 'Watch this'
    };
  }

  // 4. Books / Reading
  if (
    combined.includes('goodreads') ||
    combined.includes('kindle') ||
    combined.includes('audiobook') ||
    combined.includes('hardcover') ||
    combined.includes('paperback') ||
    combined.includes('novel') ||
    combined.includes('book') ||
    combined.includes('read')
  ) {
    return {
      intent: 'read',
      intent_reasoning: 'Identified book, novel, or reading material.',
      suggested_comment: cleanTitle ? `Read this: "${cleanTitle}"` : 'Read this'
    };
  }

  // 5. Food & Dining
  if (
    combined.includes('restaurant') ||
    combined.includes('cafe') ||
    combined.includes('bakery') ||
    combined.includes('yelp') ||
    combined.includes('menu') ||
    combined.includes('dining') ||
    combined.includes('eat') ||
    combined.includes('taste')
  ) {
    return {
      intent: 'eat',
      intent_reasoning: 'Identified food, restaurant, or dining experience.',
      suggested_comment: cleanTitle ? `Visit and try this: "${cleanTitle}"` : 'Visit and try this'
    };
  }

  // 6. Travel & Places
  if (
    combined.includes('tripadvisor') ||
    combined.includes('hotel') ||
    combined.includes('airbnb') ||
    combined.includes('resort') ||
    combined.includes('visit') ||
    combined.includes('travel') ||
    combined.includes('flight')
  ) {
    return {
      intent: 'visit',
      intent_reasoning: 'Identified travel destination or place to visit.',
      suggested_comment: cleanTitle ? `Visit this place: "${cleanTitle}"` : 'Visit this place'
    };
  }

  // 7. Gift context
  if (combined.includes('gift') || combined.includes('present') || combined.includes('birthday')) {
    return {
      intent: 'gift',
      intent_reasoning: 'User context indicates a gift idea.',
      suggested_comment: cleanTitle ? `Gift idea: "${cleanTitle}"` : 'Gift idea'
    };
  }

  // 8. Research / Study
  if (combined.includes('research') || combined.includes('paper') || combined.includes('study') || combined.includes('learn')) {
    return {
      intent: 'research',
      intent_reasoning: 'Identified topic, paper, or tool to research.',
      suggested_comment: cleanTitle ? `Research this: "${cleanTitle}"` : 'Research this'
    };
  }

  // 9. Try / Experience
  if (combined.includes('try') || combined.includes('sample') || combined.includes('test out')) {
    return {
      intent: 'try',
      intent_reasoning: 'Identified item or activity to test/try.',
      suggested_comment: cleanTitle ? `Want to try this: "${cleanTitle}"` : 'Want to try this'
    };
  }

  // 10. E-commerce in-stock product
  if (combined.includes('price') || combined.includes('cart') || combined.includes('shop') || combined.includes('store') || combined.includes('order')) {
    return {
      intent: 'buy',
      intent_reasoning: 'Identified product available for purchase.',
      suggested_comment: cleanTitle && context.website ? `Buy this ${cleanTitle} on ${context.website}` : 'Buy this'
    };
  }

  // General Web Page
  return {
    intent: 'read',
    intent_reasoning: 'Identified webpage or online article.',
    suggested_comment: cleanTitle && context.website ? `Read this on ${context.website}: "${cleanTitle}"` : 'Read this'
  };
}

export async function analyzeScreenshot(
  imageBase64: string,
  userPrompt?: string
): Promise<StructuredAIOutput> {
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  // 1. Instant Local OCR: Read all visible text directly from the captured screen
  let ocrText = '';
  try {
    const { createWorker } = require('tesseract.js');
    const worker = await createWorker('eng');
    const ret = await worker.recognize(`data:image/jpeg;base64,${cleanBase64}`);
    ocrText = (ret.data?.text || '').trim();
    await worker.terminate();
  } catch (ocrErr: any) {
    console.warn('[OCR] Screen text extraction warning:', ocrErr?.message);
  }

  // 2. Extract Candidate Signals from the Entire Screen Text
  const lines = ocrText
    .split(/\r?\n/)
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 2);
  const candidateTitle = lines[0] || userPrompt || 'Captured Screen Item';
  const priceMatch = ocrText.match(/([$€£¥₹]\s?[\d,]+(?:\.\d{2})?)/);
  const detectedPrice = priceMatch ? priceMatch[1] : null;

  // 3. Fast Deduce Intent & Comment from the actual visible screen contents
  const defaults = deduceIntentAndDefaults({
    text: `${ocrText} ${userPrompt || ''}`,
    screenText: ocrText,
    title: candidateTitle
  });

  // Instant Fast Path: If screen text indicates out of stock, return immediately
  if (defaults.suggested_comment === 'Wait till stock is back or look up at local store') {
    const finalBullets = userPrompt ? summarizeToBulletPoints(userPrompt) : [];
    return {
      title: candidateTitle,
      description: lines.slice(1, 3).join(' ') || 'Captured from screen.',
      category: 'Shopping',
      subcategory: 'General',
      intent: 'buy',
      intent_reasoning: 'Screen text indicates currently out of stock or unavailable.',
      suggested_comment: 'Wait till stock is back or look up at local store',
      bullet_points: finalBullets,
      price: detectedPrice,
      tags: ['snip', 'out-of-stock'],
      metadata: {
        source: 'desktop_capture',
        isOutOfStock: true,
        ocr_preview: ocrText.substring(0, 300)
      }
    };
  }

  // 4. Optionally query AI for refined classification (with 3.5s responsive timeout)
  let aiParsed: any = null;
  if (ocrText || userPrompt) {
    const systemPrompt = `You are an expert AI wishlist assistant. Analyze text from a screen capture, deduce the item's purpose, category, and smart comment.
${JSON_PROMPT_INSTRUCTIONS}
Rules:
1. If the screen shows out of stock, unavailable, or sold out:
   suggested_comment MUST BE: "Wait till stock is back or look up at local store".
2. If the screen shows an article/page, detect its genre:
   - Movie review: 'Read this movie review: "[Title]"'
   - Crime story: 'Read this crime story: "[Title]"'
   - Educational guide: 'Read this educational guide: "[Topic]"'
   - Tech article: 'Read this tech article: "[Title]"'
   - Other articles: 'Read this [genre]: "[Title]"'
3. Movie/Show streaming: 'Watch this: "[Title]"'
4. Book/Literature: 'Read this: "[Title]"'
5. In-stock shopping: 'Buy this [Product Name]'`;

    const userMsg = `Entire text read from screen capture:
"""
${ocrText.substring(0, 2500) || 'None'}
"""
User prompt: "${userPrompt || 'None'}"`;

    aiParsed = await queryAI(systemPrompt, userMsg, 8000);
  }

  const finalTitle = aiParsed?.title || candidateTitle;
  const finalDesc = aiParsed?.description || (lines.slice(1, 3).join(' ') || 'Captured from screen.');
  const initialCat = aiParsed?.category || (defaults.intent === 'watch' ? 'Movies & Shows' : defaults.intent === 'read' ? 'Books' : defaults.intent === 'eat' ? 'Food & Dining' : 'Other');
  const finalCat = normalizeCategory(initialCat).category;
  const finalSub = aiParsed?.subcategory || 'General';
  const finalIntent = aiParsed?.intent || defaults.intent;
  const finalReasoning = aiParsed?.intent_reasoning || defaults.intent_reasoning;
  const finalComment = aiParsed?.suggested_comment || defaults.suggested_comment;
  const finalBullets = userPrompt
    ? summarizeToBulletPoints(userPrompt)
    : (Array.isArray(aiParsed?.bullet_points) && aiParsed.bullet_points.length > 0 ? aiParsed.bullet_points : []);

  return {
    title: finalTitle,
    description: finalDesc,
    category: finalCat,
    subcategory: finalSub,
    intent: finalIntent,
    intent_reasoning: finalReasoning,
    suggested_comment: finalComment,
    bullet_points: finalBullets,
    price: aiParsed?.price || detectedPrice,
    tags: Array.isArray(aiParsed?.tags) ? aiParsed.tags : ['snip', finalIntent],
    metadata: {
      source: 'desktop_capture',
      ocr_preview: ocrText.substring(0, 300),
      intent_reasoning: finalReasoning,
      bullet_points: finalBullets
    }
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
    isOutOfStock?: boolean;
    stockReason?: string;
    genre?: string;
    breadcrumbs?: string[];
    keywords?: string[];
    snippet?: string;
    screenText?: string;
  }
): Promise<StructuredAIOutput> {
  const combinedContext = {
    text: `${webData.userPrompt || ''} ${webData.selectedText || ''} ${JSON.stringify(webData.ogData || '')}`,
    url: webData.url,
    website: webData.website,
    title: webData.title,
    isOutOfStock: webData.isOutOfStock,
    stockReason: webData.stockReason,
    genre: webData.genre,
    breadcrumbs: webData.breadcrumbs,
    keywords: webData.keywords,
    snippet: webData.snippet,
    screenText: webData.screenText
  };
  const defaults = deduceIntentAndDefaults(combinedContext);

  // 1. Instant Fast Path: If screen text indicates out of stock
  if (defaults.suggested_comment === 'Wait till stock is back or look up at local store') {
    const rawTitle = webData.title || '';
    const cleanTitle = rawTitle.replace(/\s*[-|–]\s*.*$/, '').trim();
    const bullets = webData.userPrompt || webData.selectedText
      ? summarizeToBulletPoints(webData.userPrompt || webData.selectedText)
      : [];
    return {
      title: cleanTitle || webData.title || 'Out of Stock Item',
      description: webData.ogData?.description || (webData.screenText || '').substring(0, 150) || '',
      category: 'Shopping',
      subcategory: 'General',
      intent: 'buy',
      intent_reasoning: 'Visible screen text indicates item is currently out of stock or unavailable.',
      suggested_comment: 'Wait till stock is back or look up at local store',
      bullet_points: bullets,
      price: webData.price || null,
      tags: ['shopping', 'out-of-stock'],
      metadata: {
        url: webData.url,
        website: webData.website,
        isOutOfStock: true,
        stockReason: webData.stockReason || 'Currently unavailable'
      }
    };
  }

  const systemPrompt = `You are an expert AI wishlist assistant. Extract and categorize webpage product/content details, deduce the primary intent (what it's for), provide a context-specific, intelligent default comment, and summarize any notes.
${JSON_PROMPT_INSTRUCTIONS}
Rules for suggested_comment:
1. Stock Status: If the item or page indicates it is OUT OF STOCK / SOLD OUT / UNAVAILABLE:
   suggested_comment MUST BE: "Wait till stock is back or look up at local store".
2. Web Articles / Pages: Detect the specific genre (e.g. "movie review", "crime story", "educational guide", "tech article", "news report", "research paper", "recipe", etc.). Set suggested_comment to:
   - For movie review: 'Read this movie review: "[Title]"'
   - For crime story: 'Read this crime story: "[Title]"'
   - For educational / tutorial: 'Read this educational guide: "[Topic]"'
   - For tech article: 'Read this tech article: "[Title]"'
   - For other articles: 'Read this [genre]: "[Title]"'
3. Movies / Streaming video: 'Watch this: "[Title]"'
4. Books / Literature: 'Read this: "[Title]"'
5. Food / Restaurant: 'Visit and try this: "[Title]"'
6. In-Stock Shopping: 'Buy this [Product Name] on [Website]'
7. Summarize any user comments or selected text into concise bullet points in "bullet_points".`;

  const userMsg = `Analyze this webpage content read from the screen and output JSON:
URL: ${webData.url}
Title: ${webData.title}
Website: ${webData.website || 'Unknown'}
Extracted Price: ${webData.price || 'None'}
Stock Status: ${webData.isOutOfStock ? 'OUT OF STOCK / UNAVAILABLE' : 'Available / In Stock'}
Stock Details: ${webData.stockReason || 'None'}
Page Genre: ${webData.genre || 'General'}
Entire Visible Screen Text:
"""
${(webData.screenText || webData.snippet || '').substring(0, 2500)}
"""
User Notes: ${webData.userPrompt || 'None'}`;

  const aiParsed = await queryAI(systemPrompt, userMsg, 3500);

  if (aiParsed) {
    const bulletSummary = webData.userPrompt || webData.selectedText
      ? summarizeToBulletPoints(webData.userPrompt || webData.selectedText)
      : (Array.isArray(aiParsed.bullet_points) ? aiParsed.bullet_points : []);

    const validated = StructuredAIOutputSchema.parse({
      title: aiParsed.title || webData.title,
      description: aiParsed.description || (webData.ogData && webData.ogData.description) || '',
      category: aiParsed.category || 'Other',
      subcategory: aiParsed.subcategory || 'General',
      intent: aiParsed.intent || defaults.intent,
      intent_reasoning: aiParsed.intent_reasoning || defaults.intent_reasoning,
      suggested_comment: aiParsed.suggested_comment || defaults.suggested_comment,
      bullet_points: bulletSummary,
      price: aiParsed.price || webData.price || null,
      tags: Array.isArray(aiParsed.tags) ? aiParsed.tags : [webData.website || 'web'],
      metadata: {
        ...(aiParsed.metadata || {}),
        genre: webData.genre,
        isOutOfStock: webData.isOutOfStock,
        stockReason: webData.stockReason,
        breadcrumbs: webData.breadcrumbs
      }
    });

    const { category: normalizedCat } = normalizeCategory(validated.category);
    return {
      ...validated,
      category: normalizedCat
    };
  }

  // Fast Deterministic Fallback from visible screen contents
  let category = 'Other';
  let subcategory = 'General';
  const rawTitle = webData.title || '';
  const cleanTitle = rawTitle.replace(/\s*[-|–]\s*.*$/, '').trim();

  if (webData.genre === 'movie review') {
    category = 'Movies & Shows';
    subcategory = 'Reviews';
  } else if (webData.genre === 'crime story') {
    category = 'Books';
    subcategory = 'Crime & Mystery';
  } else if (webData.genre === 'educational guide') {
    category = 'Education & Learning';
    subcategory = 'Tutorials';
  } else if (webData.genre === 'tech article') {
    category = 'Technology';
    subcategory = 'Articles';
  } else if (webData.genre === 'recipe') {
    category = 'Food & Dining';
    subcategory = 'Recipes';
  } else if (webData.genre === 'travel guide') {
    category = 'Travel & Places';
    subcategory = 'Guides';
  } else if (webData.genre === 'research paper') {
    category = 'Education & Learning';
    subcategory = 'Research';
  } else {
    const lowerTitle = (webData.title || '').toLowerCase();
    const lowerUrl = (webData.url || '').toLowerCase();
    const lowerSite = (webData.website || '').toLowerCase();

    if (lowerUrl.includes('shoes') || lowerTitle.includes('shoe') || lowerTitle.includes('sneaker') || lowerTitle.includes('boots')) {
      category = 'Fashion';
      subcategory = 'Shoes';
    } else if (lowerUrl.includes('clothing') || lowerTitle.includes('jacket') || lowerTitle.includes('dress') || lowerTitle.includes('shirt')) {
      category = 'Fashion';
      subcategory = 'Apparel';
    } else if (lowerSite.includes('goodreads') || lowerTitle.includes('book') || lowerTitle.includes('novel')) {
      category = 'Books';
      subcategory = 'Books';
    } else if (lowerSite.includes('prime') || lowerSite.includes('netflix') || lowerSite.includes('imdb') || lowerTitle.includes('movie')) {
      category = 'Movies & Shows';
      subcategory = 'Movies';
    } else if (lowerSite.includes('yelp') || lowerTitle.includes('restaurant') || lowerTitle.includes('bakery') || lowerTitle.includes('cafe')) {
      category = 'Food & Dining';
      subcategory = 'Restaurants';
    }
  }

  const { category: normalizedCat } = normalizeCategory(category);
  const bullets = webData.userPrompt || webData.selectedText
    ? summarizeToBulletPoints(webData.userPrompt || webData.selectedText)
    : [];

  return {
    title: cleanTitle || webData.title || 'Saved Webpage',
    description: webData.ogData?.description || webData.snippet?.substring(0, 150) || '',
    category: normalizedCat,
    subcategory: subcategory,
    intent: defaults.intent,
    intent_reasoning: defaults.intent_reasoning,
    suggested_comment: defaults.suggested_comment,
    bullet_points: bullets,
    price: webData.price || null,
    tags: [normalizedCat.toLowerCase(), webData.website || 'web', defaults.intent],
    metadata: {
      url: webData.url,
      website: webData.website,
      genre: webData.genre,
      isOutOfStock: webData.isOutOfStock,
      stockReason: webData.stockReason,
      breadcrumbs: webData.breadcrumbs
    }
  };
}

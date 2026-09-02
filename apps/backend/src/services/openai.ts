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
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are an expert AI wishlist assistant. Analyze captured screenshots and user context to identify the item and categorize it.
${JSON_PROMPT_INSTRUCTIONS}
Normalize categories strictly into standard canonical forms (e.g. clothes/sneakers -> Fashion, books -> Books, games/lego -> Gaming & Toys, movies -> Movies & Shows).`
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
        max_tokens: 800
      });

      const rawJson = response.choices[0]?.message?.content;
      if (rawJson) {
        const parsed = extractAndParseJson(rawJson);
        const validated = StructuredAIOutputSchema.parse({
          title: parsed.title || 'Captured Item',
          description: parsed.description || '',
          category: parsed.category || 'Other',
          subcategory: parsed.subcategory || 'General',
          intent: parsed.intent || (userPrompt ? deduceIntentFromPrompt(userPrompt) : 'buy'),
          price: parsed.price ?? null,
          tags: Array.isArray(parsed.tags) ? parsed.tags : ['snip'],
          metadata: parsed.metadata || {}
        });

        const { category: normalizedCat } = normalizeCategory(validated.category);
        return {
          ...validated,
          category: normalizedCat,
          intent: userPrompt ? deduceIntentFromPrompt(userPrompt) : validated.intent
        };
      }
    } catch (err: any) {
      console.warn(`[AI Vision: ${model}] Inference attempt failed or timed out:`, err.message);
    }
  }

  // Smart Heuristic Fallback when model is loading or offline
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
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are an expert AI wishlist assistant. Extract and categorize webpage product/content details.
${JSON_PROMPT_INSTRUCTIONS}`
          },
          {
            role: 'user',
            content: `Analyze this webpage extraction and output JSON:
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
        const parsed = extractAndParseJson(rawJson);
        const validated = StructuredAIOutputSchema.parse({
          title: parsed.title || webData.title,
          description: parsed.description || (webData.ogData && webData.ogData.description) || '',
          category: parsed.category || 'Other',
          subcategory: parsed.subcategory || 'General',
          intent: parsed.intent || deducedIntent,
          price: parsed.price || webData.price || null,
          tags: Array.isArray(parsed.tags) ? parsed.tags : [webData.website || 'web'],
          metadata: parsed.metadata || {}
        });

        const { category: normalizedCat } = normalizeCategory(validated.category);
        return {
          ...validated,
          category: normalizedCat,
          intent: webData.userPrompt ? deducedIntent : validated.intent
        };
      }
    } catch (err: any) {
      console.warn(`[AI Web: ${model}] Error calling model:`, err.message);
    }
  }

  // Fallback heuristic for web analysis
  let category = 'Other';
  let subcategory = 'Web Item';
  let detectedPrice = webData.price || (webData.ogData && webData.ogData.price) || null;
  let title = webData.title || 'Saved Web Item';

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

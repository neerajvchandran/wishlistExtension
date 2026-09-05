import '../config/env';
import OpenAI from 'openai';
import { normalizeCategory, CANONICAL_CATEGORIES } from '@everything-wishlist/shared';

export interface WishlistQueryFilters {
  queryType: 'list_all' | 'latest' | 'filter_category' | 'search' | 'recent';
  searchTerm?: string | null;
  category?: string | null;
  subcategory?: string | null;
  intent?: string | null;
  limit?: number | null;
  rawQuery: string;
}

const provider = process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your_openai') ? 'openai' : 'ollama');
const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
const model = process.env.OLLAMA_MODEL || process.env.OPENAI_MODEL || (provider === 'ollama' ? 'qwen2.5vl:7b' : 'gpt-4o');

let openaiClient: OpenAI | null = null;
const isOllama = provider === 'ollama' || ollamaBaseUrl.includes('11434');

if (isOllama) {
  openaiClient = new OpenAI({
    baseURL: ollamaBaseUrl,
    apiKey: 'ollama'
  });
} else if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your_openai_api_key')) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
} else {
  openaiClient = new OpenAI({
    baseURL: 'http://localhost:11434/v1',
    apiKey: 'ollama'
  });
}

/**
 * Fast deterministic intent parser for instant response times
 */
export function heuristicInterpret(userQuery: string): WishlistQueryFilters {
  const query = userQuery.trim().toLowerCase();

  // 1. Latest item
  if (
    query.includes('latest') ||
    query.includes('newest') ||
    query.includes('last item') ||
    query.includes('last added') ||
    query === 'latest'
  ) {
    return {
      queryType: 'latest',
      limit: 1,
      rawQuery: userQuery
    };
  }

  // 2. Recent items
  if (query.includes('recently') || query.includes('recent') || query.includes('last few')) {
    return {
      queryType: 'recent',
      limit: 5,
      rawQuery: userQuery
    };
  }

  // 3. Entire / all wishlist
  if (
    query.includes('entire') ||
    query.includes('whole') ||
    query.includes('all items') ||
    query.includes('everything') ||
    query.includes('all my') ||
    query === 'show my wishlist' ||
    query === 'my wishlist' ||
    query === 'wishlist' ||
    query === 'list'
  ) {
    return {
      queryType: 'list_all',
      limit: 30,
      rawQuery: userQuery
    };
  }

  // 4. Category checks
  const categoryKeywords: Record<string, string> = {
    book: 'Books',
    books: 'Books',
    reading: 'Books',
    novel: 'Books',
    movie: 'Movies & Shows',
    movies: 'Movies & Shows',
    film: 'Movies & Shows',
    show: 'Movies & Shows',
    shows: 'Movies & Shows',
    anime: 'Movies & Shows',
    tech: 'Electronics & Tech',
    electronics: 'Electronics & Tech',
    gadget: 'Electronics & Tech',
    laptop: 'Electronics & Tech',
    computer: 'Electronics & Tech',
    phone: 'Electronics & Tech',
    smartphone: 'Electronics & Tech',
    fashion: 'Fashion',
    cloth: 'Fashion',
    clothes: 'Fashion',
    clothing: 'Fashion',
    shoe: 'Fashion',
    shoes: 'Fashion',
    sneaker: 'Fashion',
    sneakers: 'Fashion',
    jacket: 'Fashion',
    toy: 'Gaming & Toys',
    toys: 'Gaming & Toys',
    game: 'Gaming & Toys',
    games: 'Gaming & Toys',
    gaming: 'Gaming & Toys',
    lego: 'Gaming & Toys',
    food: 'Food & Dining',
    dining: 'Food & Dining',
    recipe: 'Food & Dining',
    recipes: 'Food & Dining',
    travel: 'Travel & Places',
    trip: 'Travel & Places',
    hotel: 'Travel & Places',
    place: 'Travel & Places',
    places: 'Travel & Places',
    beauty: 'Health & Beauty',
    skincare: 'Health & Beauty',
    makeup: 'Health & Beauty',
    fitness: 'Health & Beauty',
    home: 'Home & Living',
    furniture: 'Home & Living',
    kitchen: 'Home & Living',
    research: 'Research & Ideas',
    idea: 'Research & Ideas',
    ideas: 'Research & Ideas'
  };

  for (const [kw, cat] of Object.entries(categoryKeywords)) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(query)) {
      return {
        queryType: 'filter_category',
        category: cat,
        limit: 20,
        rawQuery: userQuery
      };
    }
  }

  // 5. Search for specific brand / keyword
  const searchPattern = /(?:do i have (?:any)?|any|search (?:for)?|find|show (?:me)?|look for)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:products?|items?|stuff))?(?:\?|$)/i;
  const match = userQuery.match(searchPattern);
  if (match && match[1]) {
    const term = match[1].replace(/products?|items?|stuff/gi, '').trim();
    if (term.length > 1) {
      return {
        queryType: 'search',
        searchTerm: term,
        limit: 20,
        rawQuery: userQuery
      };
    }
  }

  // Generic search with cleaned string
  const cleanTerm = userQuery.replace(/show|do|i|have|any|my|the|please|tell|me|what/gi, '').trim();
  return {
    queryType: cleanTerm.length > 0 ? 'search' : 'list_all',
    searchTerm: cleanTerm.length > 0 ? cleanTerm : undefined,
    limit: 20,
    rawQuery: userQuery
  };
}

/**
 * Use AI to interpret user natural language query with fast-path and automatic fallback
 */
export async function interpretWishlistQuery(userQuery: string): Promise<WishlistQueryFilters> {
  if (!userQuery || userQuery.trim().length === 0) {
    return {
      queryType: 'list_all',
      limit: 20,
      rawQuery: ''
    };
  }

  // 1. Check high-confidence fast-path first (runs in < 1ms)
  const heuristic = heuristicInterpret(userQuery);
  const isHighConfidence =
    heuristic.queryType === 'latest' ||
    heuristic.queryType === 'recent' ||
    heuristic.queryType === 'list_all' ||
    Boolean(heuristic.category) ||
    Boolean(heuristic.searchTerm);

  if (isHighConfidence) {
    return heuristic;
  }

  // 2. For nuanced or complex queries, consult AI model with 1500ms timeout
  if (openaiClient) {
    try {
      const canonicalCategoriesList = CANONICAL_CATEGORIES.map((c) => c.name).join(', ');

      const prompt = `You are a query parser for an "Everything Wishlist" app.
Analyze the user's message and determine what they want to see from their wishlist.

Valid canonical categories: [${canonicalCategoriesList}].

Return ONLY a single valid JSON object with:
{
  "queryType": "list_all" | "latest" | "filter_category" | "search" | "recent",
  "searchTerm": "specific keyword/brand to search or null",
  "category": "one of the valid canonical categories or null",
  "subcategory": "specific subcategory or null",
  "intent": "buy" | "gift" | "research" | "try" | "watch" | "read" | "eat" | "visit" | null,
  "limit": number
}

User message: "${userQuery}"`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const response = await openaiClient.chat.completions.create(
        {
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are a precise JSON query interpreter. You output only valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        },
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        let normalizedCategory = parsed.category;
        if (normalizedCategory) {
          const { category } = normalizeCategory(normalizedCategory);
          normalizedCategory = category;
        }

        return {
          queryType: parsed.queryType || 'search',
          searchTerm: parsed.searchTerm || null,
          category: normalizedCategory || null,
          subcategory: parsed.subcategory || null,
          intent: parsed.intent || null,
          limit: typeof parsed.limit === 'number' ? parsed.limit : 20,
          rawQuery: userQuery
        };
      }
    } catch {
      // Fall through to heuristic fallback
    }
  }

  return heuristic;
}

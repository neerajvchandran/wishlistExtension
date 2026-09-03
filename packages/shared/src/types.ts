import { z } from 'zod';

export type IntentType =
  | 'buy'
  | 'gift'
  | 'research'
  | 'try'
  | 'watch'
  | 'read'
  | 'eat'
  | 'visit'
  | 'other';

export interface WishlistItem {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  intent: IntentType;
  intent_reasoning?: string;
  suggested_comment?: string;
  bullet_points?: string[];
  image_url?: string;
  source_url?: string;
  source_website?: string;
  price?: string | null;
  user_prompt?: string;
  date_added: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  subcategories?: string[];
  sort_order?: number;
  item_count?: number;
}

export const StructuredAIOutputSchema = z.object({
  title: z.string().describe('Precise name or title of the identified item, product, book, movie, place, or concept'),
  description: z.string().describe('Clear 1-2 sentence summary of what this item is, key features or context'),
  category: z.string().describe('Standard canonical category name (e.g. Fashion, Books, Movies, Electronics, Home, Food, Travel, Toys, Gaming, Beauty)'),
  subcategory: z.string().describe('Specific subcategory (e.g. Shoes, Sci-Fi, Action, Smartphones, Coffee, Board Games, Skincare)'),
  intent: z.enum(['buy', 'gift', 'research', 'try', 'watch', 'read', 'eat', 'visit', 'other']).describe('Primary user intent deduced from visual cues, stock status, or user notes'),
  intent_reasoning: z.string().optional().describe('Short 1-sentence reasoning of why AI chose this intent and category'),
  suggested_comment: z.string().optional().describe('Default comment suggested by AI based on context, e.g. "Watch this", "Read this", "Wait till stock gets back or look at local retailers", "Buy this"'),
  bullet_points: z.array(z.string()).optional().describe('Summarized concise bullet points of any user comments, notes, or long text'),
  price: z.string().nullable().optional().describe('Detected price string with currency symbol (e.g. "$160", "€45") or null if not applicable/found'),
  tags: z.array(z.string()).describe('Useful searchable tags related to the item'),
  metadata: z.record(z.any()).optional().describe('Additional attributes detected like brand, author, release_year, specifications, etc.')
});

export type StructuredAIOutput = z.infer<typeof StructuredAIOutputSchema>;

export interface CaptureAnalysisRequest {
  imageBase64: string; // Base64 data (PNG/JPEG)
  userPrompt?: string; // Optional user context like "Gift for cousin", "Buy this"
}

export interface WebAnalysisRequest {
  url: string;
  title: string;
  website?: string;
  ogData?: {
    title?: string;
    description?: string;
    image?: string;
    price?: string;
    currency?: string;
  };
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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

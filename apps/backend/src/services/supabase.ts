import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WishlistItem, Category } from '@everything-wishlist/shared';
import { CANONICAL_CATEGORIES } from '@everything-wishlist/shared';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[Supabase] Initialized Supabase client successfully.');
  } catch (err) {
    console.warn('[Supabase] Failed to initialize Supabase client, falling back to local store.', err);
  }
} else {
  console.log('[Supabase] No credentials configured. Operating with high-fidelity local in-memory store.');
}

// In-memory fallback store starting completely empty
let inMemoryItems: WishlistItem[] = [];

let inMemoryCategories: Category[] = CANONICAL_CATEGORIES.map((cat, idx) => ({
  id: String(idx + 1),
  name: cat.name,
  slug: cat.slug,
  icon: cat.icon,
  subcategories: cat.subcategories,
  sort_order: idx + 1
}));

export const db = {
  async getItems(userId?: string): Promise<WishlistItem[]> {
    if (supabase) {
      let query = supabase.from('wishlist_items').select('*').order('date_added', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (!error && data) return data as WishlistItem[];
      console.warn('[Supabase] Error fetching items, falling back to memory store:', error);
    }
    return inMemoryItems;
  },

  async addItem(item: Omit<WishlistItem, 'id' | 'date_added'> & { id?: string }): Promise<WishlistItem> {
    const metadata = {
      ...(item.metadata || {}),
      ...(item.bullet_points ? { bullet_points: item.bullet_points } : {}),
      ...(item.intent_reasoning ? { intent_reasoning: item.intent_reasoning } : {}),
      ...(item.suggested_comment ? { suggested_comment: item.suggested_comment } : {})
    };

    const newItem: WishlistItem = {
      ...item,
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date_added: new Date().toISOString(),
      metadata,
      bullet_points: item.bullet_points || metadata.bullet_points,
      intent_reasoning: item.intent_reasoning || metadata.intent_reasoning,
      suggested_comment: item.suggested_comment || metadata.suggested_comment
    };

    if (supabase) {
      const { data, error } = await supabase.from('wishlist_items').insert(newItem).select().single();
      if (!error && data) return data as WishlistItem;
      console.warn('[Supabase] Error saving item to DB, saving to in-memory store:', error);
    }

    inMemoryItems.unshift(newItem);
    return newItem;
  },

  async updateItem(id: string, updates: Partial<WishlistItem>): Promise<WishlistItem | null> {
    if (supabase) {
      const { data, error } = await supabase.from('wishlist_items').update(updates).eq('id', id).select().single();
      if (!error && data) return data as WishlistItem;
    }

    const idx = inMemoryItems.findIndex((it) => it.id === id);
    if (idx !== -1) {
      inMemoryItems[idx] = { ...inMemoryItems[idx], ...updates };
      return inMemoryItems[idx];
    }
    return null;
  },

  async deleteItem(id: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('wishlist_items').delete().eq('id', id);
      if (!error) return true;
    }

    const initialLen = inMemoryItems.length;
    inMemoryItems = inMemoryItems.filter((it) => it.id !== id);
    return inMemoryItems.length < initialLen;
  },

  async getCategories(): Promise<Category[]> {
    if (supabase) {
      const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
      if (!error && data && data.length > 0) return data as Category[];
    }
    return inMemoryCategories;
  }
};

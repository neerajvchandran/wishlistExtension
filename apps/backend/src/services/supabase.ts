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

// In-memory fallback store with initial seed items
let inMemoryItems: WishlistItem[] = [
  {
    id: '1',
    title: 'Nike Vomero 5',
    description: 'Bows to retro early-2000s running style with mesh and TecTuff materials for rich layering and comfort.',
    category: 'Fashion',
    subcategory: 'Shoes',
    intent: 'buy',
    price: '$160',
    source_website: 'nike.com',
    source_url: 'https://www.nike.com',
    image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=60',
    user_prompt: 'Need new daily running sneakers',
    date_added: new Date(Date.now() - 3600000 * 24).toISOString(),
    metadata: { brand: 'Nike', style: 'Sneaker', colorway: 'Photon Dust' }
  },
  {
    id: '2',
    title: 'Atomic Habits by James Clear',
    description: 'An easy and proven way to build good habits and break bad ones.',
    category: 'Books',
    subcategory: 'Self-Help',
    intent: 'read',
    price: '$18.99',
    source_website: 'amazon.com',
    source_url: 'https://www.amazon.com',
    image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=60',
    user_prompt: 'Gift for my cousin or read next month',
    date_added: new Date(Date.now() - 3600000 * 48).toISOString(),
    metadata: { author: 'James Clear', pages: 320 }
  },
  {
    id: '3',
    title: 'LEGO Technic Ferrari Daytona SP3',
    description: 'Ultimate supercar collectible model building kit with authentic butterfly doors and V12 engine.',
    category: 'Gaming & Toys',
    subcategory: 'LEGO & Building',
    intent: 'buy',
    price: '$449.99',
    source_website: 'lego.com',
    source_url: 'https://www.lego.com',
    image_url: 'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=600&auto=format&fit=crop&q=60',
    user_prompt: 'Christmas gift or project to build',
    date_added: new Date(Date.now() - 3600000 * 72).toISOString(),
    metadata: { pieces: 3778, scale: '1:8' }
  },
  {
    id: '4',
    title: 'Interstellar (Christopher Nolan)',
    description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
    category: 'Movies & Shows',
    subcategory: 'Movies',
    intent: 'watch',
    price: null,
    source_website: 'imdb.com',
    source_url: 'https://www.imdb.com/title/tt0816692/',
    image_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=60',
    user_prompt: 'Rewatch on IMAX or 4K with friends',
    date_added: new Date(Date.now() - 3600000 * 12).toISOString(),
    metadata: { director: 'Christopher Nolan', release_year: 2014 }
  }
];

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
    const newItem: WishlistItem = {
      ...item,
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date_added: new Date().toISOString(),
      metadata: item.metadata || {}
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

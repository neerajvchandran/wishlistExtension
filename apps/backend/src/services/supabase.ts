import '../config/env';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WishlistItem, Category, CANONICAL_CATEGORIES } from '@everything-wishlist/shared';

// Determine persistent data directory and file path
const DATA_DIR = path.resolve(__dirname, '../../data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'wishlist_store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface LocalStoreData {
  items: WishlistItem[];
  categories: Category[];
  last_updated?: string;
}

// Helper to load items from disk
function loadLocalStore(): LocalStoreData {
  const defaultCategories: Category[] = CANONICAL_CATEGORIES.map((cat, idx) => ({
    id: String(idx + 1),
    name: cat.name,
    slug: cat.slug,
    icon: cat.icon,
    subcategories: cat.subcategories,
    sort_order: idx + 1
  }));

  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        items: Array.isArray(parsed.items) ? parsed.items : [],
        categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : defaultCategories,
        last_updated: parsed.last_updated
      };
    }
  } catch (err) {
    console.warn('[Storage] Could not parse local wishlist_store.json, creating a fresh one.', err);
  }

  const initialData: LocalStoreData = {
    items: [],
    categories: defaultCategories,
    last_updated: new Date().toISOString()
  };

  saveLocalStore(initialData);
  return initialData;
}

// Helper to save store safely to disk
function saveLocalStore(data: LocalStoreData) {
  try {
    data.last_updated = new Date().toISOString();
    const tempFile = `${LOCAL_STORE_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, LOCAL_STORE_FILE);
  } catch (err) {
    console.error('[Storage] Error writing to local wishlist_store.json:', err);
  }
}

// In-memory state backed by local disk file
let storeData: LocalStoreData = loadLocalStore();
console.log(`[Storage] Persistent disk store initialized. Loaded ${storeData.items.length} items from ${LOCAL_STORE_FILE}`);

// Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    console.log(`[Supabase] Client initialized for ${supabaseUrl}`);
  } catch (err) {
    console.warn('[Supabase] Failed to initialize client, using local persistent file store.', err);
  }
} else {
  console.log('[Supabase] No credentials configured. Using local persistent disk store (wishlist_store.json).');
}

// UUID validation helper
const isValidUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

// Helper to unpack Supabase row into shared WishlistItem
function mapRowToWishlistItem(row: any): WishlistItem {
  const meta = row.metadata || {};
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description || '',
    category: row.category,
    subcategory: row.subcategory || '',
    intent: row.intent || 'buy',
    image_url: row.image_url,
    source_url: row.source_url,
    source_website: row.source_website,
    price: row.price,
    user_prompt: row.user_prompt,
    date_added: row.date_added || row.created_at || new Date().toISOString(),
    metadata: meta,
    bullet_points: row.bullet_points || meta.bullet_points || [],
    intent_reasoning: row.intent_reasoning || meta.intent_reasoning,
    suggested_comment: row.suggested_comment || meta.suggested_comment,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export const db = {
  /**
   * Get all wishlist items
   */
  async getItems(userId?: string): Promise<WishlistItem[]> {
    if (supabase) {
      try {
        let query = supabase.from('wishlist_items').select('*').order('date_added', { ascending: false });
        if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query;
        if (!error && data) {
          const mapped = data.map(mapRowToWishlistItem);
          // Sync items to local persistent disk cache
          storeData.items = mapped;
          saveLocalStore(storeData);
          return mapped;
        }
        if (error) {
          console.warn('[Supabase] Error fetching items (falling back to disk store):', error.message);
        }
      } catch (err: any) {
        console.warn('[Supabase] Query exception (falling back to disk store):', err.message);
      }
    }

    // Always fallback to reliable local disk store
    return storeData.items;
  },

  /**
   * Add a new wishlist item
   */
  async addItem(item: Omit<WishlistItem, 'id' | 'date_added'> & { id?: string }): Promise<WishlistItem> {
    const itemId = item.id && isValidUUID(item.id) ? item.id : crypto.randomUUID();
    const dateAdded = (item as any).date_added || new Date().toISOString();

    const metadata = {
      ...(item.metadata || {}),
      ...(item.bullet_points ? { bullet_points: item.bullet_points } : {}),
      ...(item.intent_reasoning ? { intent_reasoning: item.intent_reasoning } : {}),
      ...(item.suggested_comment ? { suggested_comment: item.suggested_comment } : {})
    };

    const newItem: WishlistItem = {
      ...item,
      id: itemId,
      date_added: dateAdded,
      metadata,
      bullet_points: item.bullet_points || metadata.bullet_points,
      intent_reasoning: item.intent_reasoning || metadata.intent_reasoning,
      suggested_comment: item.suggested_comment || metadata.suggested_comment
    };

    // 1. Immediately persist to disk store so data is NEVER lost
    storeData.items.unshift(newItem);
    saveLocalStore(storeData);

    // 2. Try to sync to Supabase if connected
    if (supabase) {
      try {
        const supabasePayload: any = {
          id: itemId,
          title: newItem.title,
          description: newItem.description || '',
          category: newItem.category,
          subcategory: newItem.subcategory || '',
          intent: newItem.intent || 'buy',
          image_url: newItem.image_url || null,
          source_url: newItem.source_url || null,
          source_website: newItem.source_website || null,
          price: newItem.price || null,
          user_prompt: newItem.user_prompt || null,
          date_added: dateAdded,
          metadata
        };

        if (newItem.user_id && isValidUUID(newItem.user_id)) {
          supabasePayload.user_id = newItem.user_id;
        }

        const { data, error } = await supabase.from('wishlist_items').insert(supabasePayload).select().single();
        if (!error && data) {
          const syncedItem = mapRowToWishlistItem(data);
          // Update local copy with any server-generated fields
          storeData.items[0] = syncedItem;
          saveLocalStore(storeData);
          return syncedItem;
        } else if (error) {
          console.warn('[Supabase] Warning: Could not insert into Supabase table (persisted locally on disk):', error.message);
        }
      } catch (err: any) {
        console.warn('[Supabase] Insert error (persisted locally on disk):', err.message);
      }
    }

    return newItem;
  },

  /**
   * Update an existing wishlist item
   */
  async updateItem(id: string, updates: Partial<WishlistItem>): Promise<WishlistItem | null> {
    const idx = storeData.items.findIndex((it) => it.id === id);
    if (idx === -1) {
      return null;
    }

    const current = storeData.items[idx];
    const updatedMetadata = {
      ...(current.metadata || {}),
      ...(updates.metadata || {}),
      ...(updates.bullet_points !== undefined ? { bullet_points: updates.bullet_points } : {}),
      ...(updates.intent_reasoning !== undefined ? { intent_reasoning: updates.intent_reasoning } : {}),
      ...(updates.suggested_comment !== undefined ? { suggested_comment: updates.suggested_comment } : {})
    };

    const updatedItem: WishlistItem = {
      ...current,
      ...updates,
      metadata: updatedMetadata,
      bullet_points: updates.bullet_points ?? current.bullet_points,
      intent_reasoning: updates.intent_reasoning ?? current.intent_reasoning,
      suggested_comment: updates.suggested_comment ?? current.suggested_comment,
      updated_at: new Date().toISOString()
    };

    // 1. Persist locally to disk
    storeData.items[idx] = updatedItem;
    saveLocalStore(storeData);

    // 2. Sync to Supabase if available
    if (supabase) {
      try {
        const supabaseUpdates: any = {
          updated_at: updatedItem.updated_at
        };
        if (updates.title !== undefined) supabaseUpdates.title = updates.title;
        if (updates.description !== undefined) supabaseUpdates.description = updates.description;
        if (updates.category !== undefined) supabaseUpdates.category = updates.category;
        if (updates.subcategory !== undefined) supabaseUpdates.subcategory = updates.subcategory;
        if (updates.intent !== undefined) supabaseUpdates.intent = updates.intent;
        if (updates.image_url !== undefined) supabaseUpdates.image_url = updates.image_url;
        if (updates.source_url !== undefined) supabaseUpdates.source_url = updates.source_url;
        if (updates.source_website !== undefined) supabaseUpdates.source_website = updates.source_website;
        if (updates.price !== undefined) supabaseUpdates.price = updates.price;
        if (updates.user_prompt !== undefined) supabaseUpdates.user_prompt = updates.user_prompt;
        supabaseUpdates.metadata = updatedMetadata;

        const { data, error } = await supabase
          .from('wishlist_items')
          .update(supabaseUpdates)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          const syncedItem = mapRowToWishlistItem(data);
          storeData.items[idx] = syncedItem;
          saveLocalStore(storeData);
          return syncedItem;
        } else if (error) {
          console.warn('[Supabase] Warning updating item in Supabase (updated locally):', error.message);
        }
      } catch (err: any) {
        console.warn('[Supabase] Update error:', err.message);
      }
    }

    return updatedItem;
  },

  /**
   * Delete an item by ID
   */
  async deleteItem(id: string): Promise<boolean> {
    const initialLen = storeData.items.length;
    storeData.items = storeData.items.filter((it) => it.id !== id);
    const removed = storeData.items.length < initialLen;

    if (removed) {
      saveLocalStore(storeData);
    }

    if (supabase) {
      try {
        const { error } = await supabase.from('wishlist_items').delete().eq('id', id);
        if (error) {
          console.warn('[Supabase] Warning deleting from Supabase (deleted locally):', error.message);
        }
      } catch (err: any) {
        console.warn('[Supabase] Delete error:', err.message);
      }
    }

    return removed;
  },

  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
        if (!error && data && data.length > 0) {
          storeData.categories = data as Category[];
          saveLocalStore(storeData);
          return data as Category[];
        }
      } catch {
        // Silent fallback
      }
    }
    return storeData.categories;
  },

  /**
   * Query wishlist items based on structured filters (for WhatsApp / n8n / search)
   */
  async queryItems(filters: {
    queryType?: string;
    searchTerm?: string | null;
    category?: string | null;
    subcategory?: string | null;
    intent?: string | null;
    limit?: number | null;
  }, userId?: string): Promise<WishlistItem[]> {
    const limit = filters.queryType === 'latest' ? 1 : (filters.limit || 20);

    if (supabase) {
      try {
        let query = supabase.from('wishlist_items').select('*');
        if (userId) {
          query = query.eq('user_id', userId);
        }
        if (filters.category) {
          query = query.ilike('category', `%${filters.category}%`);
        }
        if (filters.subcategory) {
          query = query.ilike('subcategory', `%${filters.subcategory}%`);
        }
        if (filters.intent) {
          query = query.eq('intent', filters.intent);
        }
        if (filters.searchTerm && filters.searchTerm.trim().length > 0) {
          const term = filters.searchTerm.trim();
          query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,user_prompt.ilike.%${term}%,source_website.ilike.%${term}%`);
        }

        query = query.order('date_added', { ascending: false }).limit(limit);

        const { data, error } = await query;
        if (!error && data) {
          return data.map(mapRowToWishlistItem);
        } else if (error) {
          console.warn('[Supabase] queryItems error (falling back to local store):', error.message);
        }
      } catch (err: any) {
        console.warn('[Supabase] queryItems exception (falling back to local store):', err.message);
      }
    }

    // Local disk store fallback with matching query logic
    let results = [...storeData.items];
    if (userId) {
      results = results.filter((it) => !it.user_id || it.user_id === userId);
    }
    if (filters.category) {
      const catLower = filters.category.toLowerCase();
      results = results.filter((it) => it.category?.toLowerCase().includes(catLower));
    }
    if (filters.subcategory) {
      const subLower = filters.subcategory.toLowerCase();
      results = results.filter((it) => it.subcategory?.toLowerCase().includes(subLower));
    }
    if (filters.intent) {
      results = results.filter((it) => it.intent === filters.intent);
    }
    if (filters.searchTerm && filters.searchTerm.trim().length > 0) {
      const termLower = filters.searchTerm.toLowerCase();
      results = results.filter((it) =>
        (it.title && it.title.toLowerCase().includes(termLower)) ||
        (it.description && it.description.toLowerCase().includes(termLower)) ||
        (it.user_prompt && it.user_prompt.toLowerCase().includes(termLower)) ||
        (it.source_website && it.source_website.toLowerCase().includes(termLower))
      );
    }

    results.sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime());
    return results.slice(0, limit);
  }
};

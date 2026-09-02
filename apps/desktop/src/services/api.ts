import { WishlistItem, Category, StructuredAIOutput } from '@everything-wishlist/shared';

const BACKEND_URL = (window as any).BACKEND_URL_OVERRIDE || 'http://localhost:3001';

export async function fetchItems(): Promise<WishlistItem[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/items`);
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('[API] Could not reach backend, checking local storage cache...', err);
  }

  // Local storage fallback
  const cached = localStorage.getItem('everything_wishlist_items');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }
  return [];
}

export async function createItem(item: Partial<WishlistItem>): Promise<WishlistItem> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    const json = await res.json();
    if (json.success) {
      return json.data;
    }
  } catch (err) {
    console.warn('[API] Backend unreachable, saving to local storage fallback...', err);
  }

  // Fallback save
  const fallbackItem: WishlistItem = {
    id: `local_${Date.now()}`,
    title: item.title || 'Untitled',
    description: item.description || '',
    category: item.category || 'Other',
    subcategory: item.subcategory || 'General',
    intent: item.intent || 'buy',
    price: item.price || null,
    image_url: item.image_url,
    source_url: item.source_url,
    source_website: item.source_website,
    user_prompt: item.user_prompt,
    date_added: new Date().toISOString(),
    metadata: item.metadata || {}
  };

  const cached = localStorage.getItem('everything_wishlist_items');
  const items: WishlistItem[] = cached ? JSON.parse(cached) : [];
  items.unshift(fallbackItem);
  localStorage.setItem('everything_wishlist_items', JSON.stringify(items));
  return fallbackItem;
}

export async function updateItem(id: string, updates: Partial<WishlistItem>): Promise<WishlistItem> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('[API] Backend unreachable, updating local storage...', err);
  }

  const cached = localStorage.getItem('everything_wishlist_items');
  const items: WishlistItem[] = cached ? JSON.parse(cached) : [];
  const idx = items.findIndex((i) => i.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem('everything_wishlist_items', JSON.stringify(items));
    return items[idx];
  }
  throw new Error('Item not found');
}

export async function deleteItem(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/items/${id}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (json.success) return true;
  } catch (err) {
    console.warn('[API] Backend unreachable, removing from local storage...', err);
  }

  const cached = localStorage.getItem('everything_wishlist_items');
  if (cached) {
    const items: WishlistItem[] = JSON.parse(cached);
    const filtered = items.filter((i) => i.id !== id);
    localStorage.setItem('everything_wishlist_items', JSON.stringify(filtered));
  }
  return true;
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/categories`);
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('[API] Could not fetch categories from backend, using defaults.', err);
  }
  return [];
}

export async function analyzeCapture(imageBase64: string, userPrompt?: string): Promise<StructuredAIOutput> {
  const res = await fetch(`${BACKEND_URL}/api/analyze-capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, userPrompt })
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to analyze capture');
  }
  return json.data;
}

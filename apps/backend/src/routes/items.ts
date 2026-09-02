import { Router, Request, Response } from 'express';
import { db } from '../services/supabase';
import { normalizeCategory } from '@everything-wishlist/shared';

const router = Router();

// GET /api/items - list wishlist items
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string | undefined;
    const items = await db.getItems(userId);
    return res.json({ success: true, data: items });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/items - save structured wishlist item
router.post('/', async (req: Request, res: Response) => {
  try {
    const itemData = req.body;
    if (!itemData.title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    // Ensure category is normalized
    if (itemData.category) {
      const { category: normalized } = normalizeCategory(itemData.category);
      itemData.category = normalized;
    }

    const saved = await db.addItem(itemData);
    return res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/items/:id - update existing item (user can edit anything)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.category) {
      const { category: normalized } = normalizeCategory(updates.category);
      updates.category = normalized;
    }

    const updated = await db.updateItem(id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/items/:id - delete item
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await db.deleteItem(id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Item not found or already deleted' });
    }
    return res.json({ success: true, message: 'Item deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

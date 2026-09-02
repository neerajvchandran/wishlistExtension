import { Router, Request, Response } from 'express';
import { db } from '../services/supabase';

const router = Router();

// GET /api/categories - retrieve dynamic categories with item counts
router.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await db.getCategories();
    const items = await db.getItems();

    // Compute live item counts per category
    const countMap: Record<string, number> = {};
    items.forEach((item) => {
      const cat = item.category || 'Other';
      countMap[cat] = (countMap[cat] || 0) + 1;
    });

    const enriched = categories.map((cat) => ({
      ...cat,
      item_count: countMap[cat.name] || 0
    }));

    return res.json({ success: true, data: enriched });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

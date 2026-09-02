import { Router, Request, Response } from 'express';
import { analyzeScreenshot, analyzeWebpage } from '../services/openai';
import { CaptureAnalysisRequest, WebAnalysisRequest } from '@everything-wishlist/shared';

const router = Router();

// POST /api/analyze-capture: Receives desktop screenshot and optional prompt
router.post('/analyze-capture', async (req: Request, res: Response) => {
  try {
    const { imageBase64, userPrompt }: CaptureAnalysisRequest = req.body;

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'imageBase64 is required.' });
    }

    const structuredItem = await analyzeScreenshot(imageBase64, userPrompt);
    return res.json({ success: true, data: structuredItem });
  } catch (error: any) {
    console.error('Error analyzing capture:', error);
    return res.status(500).json({ success: false, error: error.message || 'Analysis failed' });
  }
});

// POST /api/analyze-web: Receives browser page details and optional prompt
router.post('/analyze-web', async (req: Request, res: Response) => {
  try {
    const body: WebAnalysisRequest = req.body;

    if (!body.url || !body.title) {
      return res.status(400).json({ success: false, error: 'url and title are required.' });
    }

    const structuredItem = await analyzeWebpage(body);
    return res.json({ success: true, data: structuredItem });
  } catch (error: any) {
    console.error('Error analyzing web data:', error);
    return res.status(500).json({ success: false, error: error.message || 'Web analysis failed' });
  }
});

export default router;

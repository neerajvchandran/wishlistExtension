import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import analyzeRouter from './routes/analyze';
import itemsRouter from './routes/items';
import categoriesRouter from './routes/categories';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({ origin: '*' }));
// Support large base64 screenshot uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'everything-wishlist-backend',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api', analyzeRouter);
app.use('/api/items', itemsRouter);
app.use('/api/categories', categoriesRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[Everything Wishlist Backend] running on http://localhost:${PORT}`);
});

import { Router } from 'express';
import proxyRouter from './media/proxy.js';
import stockRouter from './media/stock.js';
import youtubeRouter from './media/youtube.js';
import libraryRouter from './media/library.js';

/**
 * Split into feature routers under ./media/. Overlapping paths are mounted in their
 * original relative order (checked when the split was generated).
 */
const router = Router();

router.use(proxyRouter);
router.use(stockRouter);
router.use(youtubeRouter);
router.use(libraryRouter);

export default router;

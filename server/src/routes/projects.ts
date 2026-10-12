import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import crudRouter from './projects/crud.js';
import generationRouter from './projects/generation.js';
import mediaRouter from './projects/media.js';
import publishingRouter from './projects/publishing.js';
import analyticsRouter from './projects/analytics.js';

/**
 * /api/projects — split into feature routers under ./projects/.
 * Route paths don't overlap between the sub-routers, so mount order doesn't change matching.
 */
const router = Router();

// All project routes require authentication
router.use(authMiddleware);

router.use(crudRouter);
router.use(generationRouter);
router.use(mediaRouter);
router.use(publishingRouter);
router.use(analyticsRouter);

export default router;

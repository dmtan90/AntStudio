import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { licenseGating } from '../middleware/LicenseGating.js';
import { LicenseType } from '~/models/License.js';
import adminRouter from './ai/admin.js';
import liveRouter from './ai/live.js';
import mediaRouter from './ai/media.js';
import analysisRouter from './ai/analysis.js';
import contentRouter from './ai/content.js';

/**
 * Split into feature routers under ./ai/. Overlapping paths are mounted in their
 * original relative order (checked when the split was generated).
 */
const router = Router();

router.use(authMiddleware);
router.use(licenseGating(LicenseType.TRIAL));

router.use(adminRouter);
router.use(liveRouter);
router.use(mediaRouter);
router.use(analysisRouter);
router.use(contentRouter);

export default router;

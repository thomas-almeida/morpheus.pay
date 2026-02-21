import { Router } from 'express';
import { getOverview, getModelKpi, getTransactions } from '../controllers/kpiController.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/overview', authMiddleware, getOverview);
router.get('/model/:id', authMiddleware, getModelKpi);
router.get('/transactions', authMiddleware, getTransactions);

export default router;

import { Router } from 'express';
import { getMe, updateMe, getBalance, upgradeToPro } from '../controllers/userController.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, updateMe);
router.get('/me/balance', authMiddleware, getBalance);
router.post('/upgrade', authMiddleware, upgradeToPro);

export default router;

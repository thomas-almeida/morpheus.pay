import { Router } from 'express';
import { createSession } from '../controllers/authController.js';

const router = Router();

router.post('/session', createSession);

export default router;

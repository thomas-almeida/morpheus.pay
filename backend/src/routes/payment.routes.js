import { Router } from 'express';
import { generatePayment, webhook, checkPaymentStatus } from '../controllers/paymentController.js';

const router = Router();

router.post('/generate', generatePayment);
router.post('/webhook', webhook);
router.get('/status/:transactionId', checkPaymentStatus);

export default router;

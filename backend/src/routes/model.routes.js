import { Router } from 'express';
import { getModels, createModel, getModel, updateModel, deleteModel, registerClick } from '../controllers/modelController.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import planMiddleware from '../middlewares/plan.middleware.js';

const router = Router();

router.get('/', authMiddleware, getModels);
router.post('/', authMiddleware, planMiddleware, createModel);
router.get('/:id', authMiddleware, getModel);
router.put('/:id', authMiddleware, updateModel);
router.delete('/:id', authMiddleware, deleteModel);
router.post('/:id/click', registerClick);

export default router;

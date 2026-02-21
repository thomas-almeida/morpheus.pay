import User from '../models/User.js';
import Model from '../models/Model.js';

const FREEMIUM_LIMIT = 2;

export const planMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.plan === 'pro') {
      return next();
    }

    const modelCount = await Model.countDocuments({ owner: req.userId, isActive: true });

    if (modelCount >= FREEMIUM_LIMIT) {
      return res.status(403).json({
        error: 'Freemium limit reached',
        message: 'Upgrade to PRO to create unlimited models',
        limit: FREEMIUM_LIMIT,
        current: modelCount
      });
    }

    next();
  } catch (error) {
    console.error('Plan middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default planMiddleware;

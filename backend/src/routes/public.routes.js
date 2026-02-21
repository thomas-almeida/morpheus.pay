import { Router } from 'express';
import Model from '../models/Model.js';

const router = Router();

router.get('/checkout/:domain/:username', async (req, res) => {
  try {
    const { domain, username } = req.params;

    const model = await Model.findOne({
      domains: { $in: [domain] },
      username: username.toLowerCase(),
      isActive: true
    });

    if (!model) {
      return res.status(404).json({ error: 'Checkout not found' });
    }

    res.json({
      displayName: model.displayName,
      description: model.description,
      profilePhoto: model.profilePhoto,
      coverPhoto: model.coverPhoto,
      template: model.template,
      pricing: model.pricing,
      stats: {
        clicks: model.stats?.clicks || 0
      }
    });
  } catch (error) {
    console.error('Public checkout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

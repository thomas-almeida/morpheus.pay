import Model from '../models/Model.js';
import User from '../models/User.js';
import config from '../config/env.js';

export const getModels = async (req, res) => {
  try {
    const models = await Model.find({ owner: req.userId, isActive: true });
    res.json(models);
  } catch (error) {
    console.error('Get models error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createModel = async (req, res) => {
  try {
    const {
      username,
      displayName,
      description,
      profilePhoto,
      coverPhoto,
      domains,
      template,
      pricing
    } = req.body;

    if (!username || !displayName || !domains || domains.length === 0) {
      return res.status(400).json({ error: 'username, displayName and domains are required' });
    }

    const invalidDomains = domains.filter(d => !config.allowedDomains.includes(d));
    if (invalidDomains.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid domains', 
        invalidDomains,
        allowedDomains: config.allowedDomains 
      });
    }

    for (const domain of domains) {
      const existing = await Model.findOne({ domains: { $in: [domain] }, username: username.toLowerCase() });
      if (existing) {
        return res.status(400).json({ error: `Username already taken in domain: ${domain}` });
      }
    }

    const model = await Model.create({
      owner: req.userId,
      username: username.toLowerCase(),
      displayName,
      description: description || '',
      profilePhoto: profilePhoto || '',
      coverPhoto: coverPhoto || '',
      domains,
      template: template || 'clean',
      pricing: pricing || {}
    });

    await User.findByIdAndUpdate(req.userId, {
      $push: { models: model._id }
    });

    res.status(201).json(model);
  } catch (error) {
    console.error('Create model error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getModel = async (req, res) => {
  try {
    const model = await Model.findOne({ _id: req.params.id, owner: req.userId });

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json(model);
  } catch (error) {
    console.error('Get model error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateModel = async (req, res) => {
  try {
    const {
      displayName,
      description,
      profilePhoto,
      coverPhoto,
      domains,
      template,
      pricing,
      isActive
    } = req.body;

    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (description !== undefined) updates.description = description;
    if (profilePhoto !== undefined) updates.profilePhoto = profilePhoto;
    if (coverPhoto !== undefined) updates.coverPhoto = coverPhoto;
    if (template !== undefined) updates.template = template;
    if (pricing !== undefined) updates.pricing = pricing;
    if (isActive !== undefined) updates.isActive = isActive;

    if (domains !== undefined) {
      if (!domains || domains.length === 0) {
        return res.status(400).json({ error: 'At least one domain is required' });
      }

      const invalidDomains = domains.filter(d => !config.allowedDomains.includes(d));
      if (invalidDomains.length > 0) {
        return res.status(400).json({ 
          error: 'Invalid domains', 
          invalidDomains,
          allowedDomains: config.allowedDomains 
        });
      }

      const currentModel = await Model.findById(req.params.id);
      if (!currentModel) {
        return res.status(404).json({ error: 'Model not found' });
      }

      const username = currentModel.username;
      for (const domain of domains) {
        const existing = await Model.findOne({ 
          domains: { $in: [domain] }, 
          username,
          _id: { $ne: req.params.id }
        });
        if (existing) {
          return res.status(400).json({ error: `Username already taken in domain: ${domain}` });
        }
      }

      updates.domains = domains;
    }

    const model = await Model.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      updates,
      { new: true }
    );

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json(model);
  } catch (error) {
    console.error('Update model error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteModel = async (req, res) => {
  try {
    const model = await Model.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { isActive: false },
      { new: true }
    );

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    await User.findByIdAndUpdate(req.userId, {
      $pull: { models: model._id }
    });

    res.json({ message: 'Model deleted successfully' });
  } catch (error) {
    console.error('Delete model error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const registerClick = async (req, res) => {
  try {
    const model = await Model.findByIdAndUpdate(
      req.params.id,
      { $inc: { 'stats.clicks': 1 } },
      { new: true }
    );

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({ success: true, clicks: model.stats.clicks });
  } catch (error) {
    console.error('Register click error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default { getModels, createModel, getModel, updateModel, deleteModel, registerClick };

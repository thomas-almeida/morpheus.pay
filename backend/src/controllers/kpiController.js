import Model from '../models/Model.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

export const getOverview = async (req, res) => {
  try {
    const models = await Model.find({ owner: req.userId, isActive: true });
    const user = await User.findById(req.userId);

    const totalClicks = models.reduce((sum, m) => sum + (m.stats?.clicks || 0), 0);
    const totalSales = models.reduce((sum, m) => sum + (m.stats?.sales || 0), 0);
    const totalRevenue = models.reduce((sum, m) => sum + (m.stats?.totalRevenue || 0), 0);

    const topModel = models.reduce((top, m) => {
      const sales = m.stats?.sales || 0;
      if (!top || sales > top.sales) {
        return { id: m._id, displayName: m.displayName, sales };
      }
      return top;
    }, null);

    res.json({
      totalClicks,
      totalSales,
      totalRevenue,
      balance: user.balance,
      topModel
    });
  } catch (error) {
    console.error('Get overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getModelKpi = async (req, res) => {
  try {
    const model = await Model.findOne({ _id: req.params.id, owner: req.userId });

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({
      id: model._id,
      displayName: model.displayName,
      stats: model.stats
    });
  } catch (error) {
    console.error('Get model KPI error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const { status, modelId, from, to } = req.query;

    const query = { owner: req.userId };

    if (status) query.status = status;
    if (modelId) query.model = modelId;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const transactions = await Transaction.find(query)
      .populate('model', 'displayName')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default { getOverview, getModelKpi, getTransactions };

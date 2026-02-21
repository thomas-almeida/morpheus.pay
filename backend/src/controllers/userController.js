import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { createPixCharge } from '../services/payment.service.js';

const PRO_PRICE = 4790; // R$ 47,90 em centavos
const PRO_DURATION_DAYS = 30;

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-__v');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMe = async (req, res) => {
  try {
    const { name, lastName, whatsapp, pixKey } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (lastName !== undefined) updates.lastName = lastName;
    if (whatsapp !== undefined) updates.whatsapp = whatsapp;
    if (pixKey !== undefined) updates.pixKey = pixKey;

    const user = await User.findByIdAndUpdate(
      req.userId,
      updates,
      { new: true }
    ).select('-__v');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBalance = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('balance');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.balance);
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const upgradeToPro = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date();
    const hasActivePro = user.plan === 'pro' && 
      user.planExpiration && 
      new Date(user.planExpiration) > now;

    if (hasActivePro) {
      return res.status(400).json({ 
        error: 'PRO plan already active',
        planExpiration: user.planExpiration
      });
    }

    const buyer = {
      name: user.name,
      email: user.email,
      cellphone: user.whatsapp || '',
      taxId: ''
    };

    const paymentResult = await createPixCharge({
      amount: PRO_PRICE,
      buyer,
      modelId: null,
      plan: 'monthly',
      isSubscription: true,
      subscriptionType: 'pro_upgrade'
    });

    if (!paymentResult.success) {
      return res.status(500).json({ error: paymentResult.error });
    }

    const transaction = await Transaction.create({
      model: null,
      owner: user._id,
      buyer,
      plan: 'monthly',
      amount: PRO_PRICE,
      platformFee: 0,
      netAmount: PRO_PRICE,
      status: 'pending',
      type: 'subscription_upgrade',
      gateway: {
        provider: 'abacatepay',
        paymentId: paymentResult.data.paymentId,
        qrCode: paymentResult.data.qrCode,
        qrCodeImage: paymentResult.data.qrCodeImageBase64,
        expiresAt: paymentResult.data.expiresAt
      }
    });

    res.json({
      subscriptionId: transaction._id,
      qrCode: paymentResult.data.qrCode,
      qrCodeImageBase64: paymentResult.data.qrCodeImageBase64,
      expiresAt: paymentResult.data.expiresAt,
      amount: PRO_PRICE,
      plan: 'pro'
    });
  } catch (error) {
    console.error('Upgrade to PRO error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default { getMe, updateMe, getBalance, upgradeToPro };

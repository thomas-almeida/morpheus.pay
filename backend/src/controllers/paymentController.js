import Model from '../models/Model.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import config from '../config/env.js';
import { createPixCharge, checkPixStatus } from '../services/payment.service.js';

const PRO_DURATION_DAYS = 30;

const processPaymentSuccess = async (transaction) => {
  if (transaction.status === 'paid') {
    return false;
  }

  await Transaction.findByIdAndUpdate(transaction._id, {
    status: 'paid',
    paidAt: new Date()
  });

  if (transaction.type === 'subscription_upgrade') {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + PRO_DURATION_DAYS);

    await User.findByIdAndUpdate(transaction.owner, {
      plan: 'pro',
      planExpiration: expirationDate
    });

    return true;
  }

  await Model.findByIdAndUpdate(transaction.model, {
    $inc: {
      'stats.sales': 1,
      'stats.totalRevenue': transaction.netAmount
    }
  });

  await User.findByIdAndUpdate(transaction.owner, {
    $inc: {
      'balance.pending': transaction.netAmount
    }
  });

  return true;
};

export const generatePayment = async (req, res) => {
  try {
    const { modelId, plan, buyer } = req.body;

    if (!modelId || !plan || !buyer) {
      return res.status(400).json({ error: 'modelId, plan and buyer are required' });
    }

    const model = await Model.findById(modelId);
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const pricing = model.pricing[plan];
    if (!pricing || !pricing.enabled) {
      return res.status(400).json({ error: 'Plan not available' });
    }

    const user = await User.findById(model.owner);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const platformFeePercent = user.plan === 'pro' ? 6 : 12;
    const amount = pricing.price;
    const platformFee = Math.round(amount * (platformFeePercent / 100));
    const netAmount = amount - platformFee;

    const transaction = await Transaction.create({
      model: modelId,
      owner: model.owner,
      buyer,
      plan,
      amount,
      platformFee,
      netAmount,
      status: 'pending'
    });

    const paymentResult = await createPixCharge({
      amount,
      buyer,
      modelId,
      plan
    });

    if (!paymentResult.success) {
      await Transaction.findByIdAndUpdate(transaction._id, {
        status: 'failed'
      });
      return res.status(500).json({ error: paymentResult.error });
    }

    await Transaction.findByIdAndUpdate(transaction._id, {
      'gateway.paymentId': paymentResult.data.paymentId,
      'gateway.qrCode': paymentResult.data.qrCode,
      'gateway.qrCodeImage': paymentResult.data.qrCodeImageBase64,
      'gateway.expiresAt': paymentResult.data.expiresAt
    });

    res.json({
      transactionId: transaction._id,
      qrCode: paymentResult.data.qrCode,
      qrCodeImageBase64: paymentResult.data.qrCodeImageBase64,
      expiresAt: paymentResult.data.expiresAt,
      amount,
      platformFee,
      platformFeePercent,
      netAmount,
      plan
    });
  } catch (error) {
    console.error('Generate payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const webhook = async (req, res) => {
  try {
    const webhookSecret = req.query.webhookSecret;
    
    if (webhookSecret !== config.payment.abacatePay.webhookSecret) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }

    const { event, data } = req.body;

    if (event !== 'billing.paid') {
      return res.json({ received: true });
    }

    const paymentId = data?.payment?.pixQrCode?.id || data?.billingId;
    
    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID not found' });
    }

    const transaction = await Transaction.findOne({ 'gateway.paymentId': paymentId });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const updated = await processPaymentSuccess(transaction);
    
    if (!updated) {
      return res.json({ received: true });
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const checkPaymentStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status === 'paid') {
      return res.json({
        transactionId: transaction._id,
        type: transaction.type,
        status: 'paid',
        paidAt: transaction.paidAt
      });
    }

    const paymentId = transaction.gateway?.paymentId;
    
    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID not found' });
    }

    const statusResult = await checkPixStatus(paymentId);

    if (!statusResult.success) {
      return res.status(500).json({ error: statusResult.error });
    }

    if (statusResult.data.status === 'PAID') {
      await processPaymentSuccess(transaction);
      
      return res.json({
        transactionId: transaction._id,
        type: transaction.type,
        status: 'paid',
        paidAt: new Date()
      });
    }

    res.json({
      transactionId: transaction._id,
      type: transaction.type,
      status: statusResult.data.status,
      expiresAt: statusResult.data.expiresAt
    });
  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default { generatePayment, webhook, checkPaymentStatus };

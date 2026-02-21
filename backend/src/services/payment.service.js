import axios from 'axios';
import crypto from 'crypto';
import config from '../config/env.js';

const ABACATEPAY_API_URL = 'https://api.abacatepay.com/v1';

const getHeaders = () => ({
  'Authorization': `Bearer ${config.payment.abacatePay.apiKey}`,
  'Content-Type': 'application/json'
});

export const createPixCharge = async ({ amount, buyer, modelId, plan, isSubscription, subscriptionType }) => {
  try {
    let description, externalId, metadata;

    if (isSubscription) {
      description = 'Assinatura PRO Morpheus Pay - Plano Mensal';
      externalId = 'prod_pro_monthly';
      metadata = {
        type: subscriptionType || 'subscription_upgrade',
        userId: buyer.userId || 'unknown'
      };
    } else {
      const planName = plan === 'weekly' ? 'Semanal' : plan === 'monthly' ? 'Mensal' : 'Anual';
      description = `${planName} - Acesso ao conteúdo`;
      externalId = `model_${modelId}_${plan}`;
      metadata = {
        modelId: modelId.toString(),
        plan
      };
    }

    const payload = {
      amount,
      expiresIn: 86400,
      description,
      customer: {
        name: buyer.name,
        cellphone: buyer.cellphone || '',
        email: buyer.email,
        taxId: buyer.taxId || ''
      },
      metadata
    };

    const response = await axios.post(
      `${ABACATEPAY_API_URL}/pixQrCode/create`,
      payload,
      { headers: getHeaders() }
    );

    const pixData = response.data.data;

    return {
      success: true,
      data: {
        paymentId: pixData.id,
        qrCode: pixData.brCode,
        qrCodeImageBase64: pixData.brCodeBase64,
        expiresAt: pixData.expiresAt,
        amount: pixData.amount,
        platformFee: pixData.platformFee,
        status: pixData.status
      }
    };
  } catch (error) {
    console.error('AbacatePay PIX QR Code error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
};

export const validateWebhookSignature = (payload, signature) => {
  const expectedSignature = crypto
    .createHmac('sha256', config.payment.abacatePay.webhookSecret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

export const checkPixStatus = async (paymentId) => {
  try {
    const response = await axios.get(
      `${ABACATEPAY_API_URL}/pixQrCode/check`,
      {
        params: { id: paymentId },
        headers: getHeaders() }
    );

    const pixData = response.data.data;

    return {
      success: true,
      data: {
        status: pixData.status,
        expiresAt: pixData.expiresAt
      }
    };
  } catch (error) {
    console.error('AbacatePay check status error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
};

export default { createPixCharge, validateWebhookSignature, checkPixStatus };

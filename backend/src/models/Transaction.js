import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  model: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Model',
    default: null
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyer: {
    name: { type: String, default: '' },
    email: { type: String, default: '' }
  },
  type: {
    type: String,
    enum: ['content_sale', 'subscription_upgrade'],
    default: 'content_sale'
  },
  plan: {
    type: String,
    enum: ['weekly', 'monthly', 'annual'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  platformFee: {
    type: Number,
    required: true
  },
  netAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  gateway: {
    provider: { type: String, default: 'abacatepay' },
    paymentId: { type: String, default: '' },
    qrCode: { type: String, default: '' },
    qrCodeImage: { type: String, default: '' },
    expiresAt: { type: Date }
  },
  paidAt: {
    type: Date
  }
}, {
  timestamps: true
});

export default mongoose.model('Transaction', transactionSchema);

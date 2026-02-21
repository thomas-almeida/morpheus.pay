import mongoose from 'mongoose';
import config from '../config/env.js';

const modelSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  profilePhoto: {
    type: String,
    default: ''
  },
  coverPhoto: {
    type: String,
    default: ''
  },
  domains: [{
    type: String,
    enum: config.allowedDomains
  }],
  template: {
    type: String,
    enum: ['dark', 'clean', 'bold'],
    default: 'clean'
  },
  pricing: {
    weekly: {
      price: { type: Number, default: 0 },
      enabled: { type: Boolean, default: false }
    },
    monthly: {
      price: { type: Number, default: 0 },
      enabled: { type: Boolean, default: false }
    },
    annual: {
      price: { type: Number, default: 0 },
      enabled: { type: Boolean, default: false }
    }
  },
  stats: {
    clicks: { type: Number, default: 0 },
    sales: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

modelSchema.index({ domains: 1, username: 1 }, { unique: true });

export default mongoose.model('Model', modelSchema);

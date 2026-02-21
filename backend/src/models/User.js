import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    default: ''
  },
  whatsapp: {
    type: String,
    default: ''
  },
  pixKey: {
    type: String,
    default: ''
  },
  plan: {
    type: String,
    enum: ['freemium', 'pro'],
    default: 'freemium'
  },
  planExpiration: {
    type: Date,
    default: null
  },
  balance: {
    available: { type: Number, default: 0 },
    pending: { type: Number, default: 0 }
  },
  models: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Model'
  }]
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import config from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import modelRoutes from './routes/model.routes.js';
import kpiRoutes from './routes/kpi.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import publicRoutes from './routes/public.routes.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' }
});

app.use('/api/', limiter);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/models', modelRoutes);
app.use('/api/v1/kpi', kpiRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/public', publicRoutes);

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'all systems normal', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;

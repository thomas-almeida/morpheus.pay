import User from '../models/User.js';
import { generateToken } from '../services/token.service.js';

export const createSession = async (req, res) => {
  try {
    const { email, name, lastName } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      user = await User.create({
        email: email.toLowerCase(),
        name: name || 'User',
        lastName: lastName || '',
        plan: 'freemium'
      });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        plan: user.plan
      }
    });
  } catch (error) {
    console.error('Auth session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default { createSession };

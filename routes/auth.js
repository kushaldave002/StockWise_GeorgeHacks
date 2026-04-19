const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Store = require('../models/Store');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role, storeId: user.storeId || null, ward: user.ward || null },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, storeId, ward } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }
    if (!['customer', 'owner'].includes(role)) {
      return res.status(400).json({ error: 'Role must be customer or owner.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    if (role === 'owner') {
      if (!storeId) return res.status(400).json({ error: 'Store owners must select a store.' });
      const store = await Store.findById(storeId);
      if (!store) return res.status(400).json({ error: 'Selected store not found.' });
    }

    const user = await User.create({
      name, email, password, role,
      storeId: role === 'owner' ? storeId : null,
      ward: role === 'customer' && ward ? Number(ward) : null
    });

    res.status(201).json({ token: signToken(user), user: { id: user._id, name: user.name, email: user.email, role: user.role, storeId: user.storeId, ward: user.ward } });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    res.json({ token: signToken(user), user: { id: user._id, name: user.name, email: user.email, role: user.role, storeId: user.storeId, ward: user.ward } });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch user.' });
  }
});

module.exports = router;

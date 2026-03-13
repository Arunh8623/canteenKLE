// controllers/authController.js — Simple email + password auth
const User   = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// GET /auth/login
exports.loginPage = (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('auth/login', { title: 'Login — KLE Canteen', user: null, error: req.query.error || null });
};

// GET /auth/register
exports.registerPage = (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('auth/register', { title: 'Register — KLE Canteen', user: null, error: null });
};

// POST /auth/register
exports.register = async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !email.toLowerCase().endsWith('@kletech.ac.in'))
      return res.json({ success: false, error: 'Only @kletech.ac.in email addresses are allowed.' });
    if (!name || name.trim().length < 2)
      return res.json({ success: false, error: 'Please enter your full name.' });
    if (!password || password.length < 6)
      return res.json({ success: false, error: 'Password must be at least 6 characters.' });
    if (!phone || !/^[6-9]\d{9}$/.test(phone))
      return res.json({ success: false, error: 'Enter a valid 10-digit mobile number.' });

    const existing = await User.findByEmail(email.toLowerCase());
    if (existing) return res.json({ success: false, error: 'This email is already registered. Please login.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      firebase_uid: 'local_' + crypto.randomBytes(8).toString('hex'),
      name: name.trim(),
      email: email.toLowerCase(),
      phone,
      profile_pic: null,
      password: hashedPassword,
    });

    req.session.userId = user.id;
    return res.json({ success: true });
  } catch (err) {
    console.error('Register error:', err.message);
    return res.json({ success: false, error: 'Registration failed. Please try again.' });
  }
};

// POST /auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.toLowerCase().endsWith('@kletech.ac.in'))
      return res.json({ success: false, error: 'Only @kletech.ac.in email addresses are allowed.' });

    const user = await User.findByEmail(email.toLowerCase());
    if (!user) return res.json({ success: false, error: 'No account found. Please register first.' });
    if (!user.password) return res.json({ success: false, error: 'This account uses a different login method.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false, error: 'Incorrect password. Please try again.' });

    req.session.userId = user.id;
    return res.json({ success: true, user: { name: user.name, role: user.role } });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.json({ success: false, error: 'Login failed. Please try again.' });
  }
};

// POST /auth/update-phone
exports.updatePhone = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!req.user) return res.status(401).json({ error: 'Not logged in' });
    if (!phone || !/^[6-9]\d{9}$/.test(phone))
      return res.status(400).json({ error: 'Invalid phone number' });
    await User.updatePhone(req.user.id, phone);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /auth/dummy-login — DEV ONLY
exports.dummyLogin = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.endsWith('@kletech.ac.in'))
      return res.redirect('/auth/login?error=Only @kletech.ac.in emails allowed');
    let user = await User.findByEmail(email);
    if (!user) {
      user = await User.create({
        firebase_uid: 'dummy_' + Date.now(),
        name: email.split('@')[0], email, phone: null, profile_pic: null,
      });
    }
    req.session.userId = user.id;
    return res.redirect('/');
  } catch (err) {
    return res.redirect('/auth/login?error=' + encodeURIComponent(err.message));
  }
};

// POST /auth/logout
exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/'));
};

// Legacy
exports.verifyToken = async (req, res) => res.status(400).json({ error: 'Use email/password login.' });
exports.sendOtp     = async (req, res) => res.status(400).json({ error: 'OTP login disabled.' });
exports.verifyOtp   = async (req, res) => res.status(400).json({ error: 'OTP login disabled.' });
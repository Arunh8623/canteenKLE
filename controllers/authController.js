// controllers/authController.js — OTP Email Auth (no Firebase)
const User       = require('../models/User');
const { sendOTP } = require('../services/mailer');
const crypto     = require('crypto');

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// GET /auth/login
exports.loginPage = (req, res) => {
  if (req.user) return res.redirect('/');
  const error = req.query.error || null;
  res.render('auth/login', { title: 'Login — KLE Canteen', user: null, error });
};

// POST /auth/send-otp
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.toLowerCase().endsWith('@kletech.ac.in')) {
      return res.json({ success: false, error: 'Only @kletech.ac.in email addresses are allowed.' });
    }

    const otp     = generateOTP();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP in session
    req.session.otp      = otp;
    req.session.otpEmail = email.toLowerCase();
    req.session.otpExp   = expires;

    // Get name if user exists
    const existing = await User.findByEmail(email.toLowerCase());
    const name = existing?.name || email.split('@')[0];

    await sendOTP(email, otp, name);
    return res.json({ success: true });
  } catch (err) {
    console.error('Send OTP error:', err.message);
    return res.json({ success: false, error: 'Failed to send OTP. Please try again.' });
  }
};

// POST /auth/verify-otp
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp, name, phone } = req.body;

    // Validate OTP
    if (!req.session.otp || !req.session.otpEmail || !req.session.otpExp) {
      return res.json({ success: false, error: 'OTP expired. Please request a new one.' });
    }
    if (Date.now() > req.session.otpExp) {
      return res.json({ success: false, error: 'OTP expired. Please request a new one.' });
    }
    if (req.session.otpEmail !== email.toLowerCase()) {
      return res.json({ success: false, error: 'Email mismatch. Please try again.' });
    }
    if (req.session.otp !== otp.trim()) {
      return res.json({ success: false, error: 'Incorrect OTP. Please try again.' });
    }

    // Clear OTP from session
    delete req.session.otp;
    delete req.session.otpEmail;
    delete req.session.otpExp;

    // Upsert user
    let user = await User.findByEmail(email.toLowerCase());
    if (!user) {
      // New user — name and phone required
      if (!name || !name.trim()) {
        return res.json({ success: false, error: 'Please enter your name.', needsProfile: true });
      }
      user = await User.create({
        firebase_uid: 'email_' + crypto.randomBytes(8).toString('hex'),
        name: name.trim(),
        email: email.toLowerCase(),
        phone: phone || null,
        profile_pic: null,
      });
    } else {
      // Existing user — update phone if provided
      if (phone && !user.phone) {
        await User.updatePhone(user.id, phone);
        user.phone = phone;
      }
    }

    req.session.userId = user.id;
    return res.json({
      success: true,
      needsPhone: !user.phone,
      user: { name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Verify OTP error:', err.message);
    return res.json({ success: false, error: 'Verification failed. Please try again.' });
  }
};

// POST /auth/update-phone
exports.updatePhone = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!req.user) return res.status(401).json({ error: 'Not logged in' });
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
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
    if (!email || !email.endsWith('@kletech.ac.in')) {
      return res.redirect('/auth/login?error=Only @kletech.ac.in emails allowed');
    }
    const name = email.split('@')[0];
    let user = await User.findByEmail(email);
    if (!user) {
      user = await User.create({
        firebase_uid: 'dummy_' + Date.now(),
        name, email, phone: null, profile_pic: null,
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

// Keep for backward compat — not used anymore
exports.verifyToken = async (req, res) => {
  return res.status(400).json({ error: 'Firebase auth disabled. Use OTP login.' });
};
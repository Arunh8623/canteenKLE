// middleware/firebaseAuth.js — Verify Firebase ID Token & load user from session
const admin = require('../config/firebase');
const User  = require('../models/User');

// Attach user to req.user if session exists (non-blocking)
const attachUser = async (req, res, next) => {
  if (req.session?.userId) {
    try {
      req.user = await User.findById(req.session.userId);
    } catch (e) {
      req.user = null;
    }
  }
  next();
};

// Require user to be logged in (redirects to login if not)
const requireAuth = (req, res, next) => {
  if (!req.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
  }
  next();
};

// Verify a raw Firebase ID token (used in /auth/verify POST)
const verifyFirebaseToken = async (idToken) => {
  const decoded = await admin.auth().verifyIdToken(idToken);
  return decoded;
};

module.exports = { attachUser, requireAuth, verifyFirebaseToken };
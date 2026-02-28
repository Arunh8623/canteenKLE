// middleware/adminAuth.js — Stall admin authentication guard
const Stall = require('../models/Stall');

// Attach admin stall to req.adminStall if session exists
const attachAdmin = async (req, res, next) => {
  if (req.session?.adminStallId) {
    try {
      req.adminStall = await Stall.findById(req.session.adminStallId);
    } catch (e) {
      req.adminStall = null;
    }
  }
  next();
};

// Require admin to be logged in
const requireAdmin = (req, res, next) => {
  if (!req.adminStall) {
    return res.redirect('/admin/login');
  }
  next();
};

module.exports = { attachAdmin, requireAdmin };
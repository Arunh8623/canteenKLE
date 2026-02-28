// routes/ai.js — AI-powered features (chatbot + suggestions)
const express = require('express');
const router  = express.Router();
const aiCtrl  = require('../controllers/aiController');

// AI Chatbot — answers questions about menu (public, no login needed)
// e.g. "What items are under ₹50?" / "Do you have vegan options?"
// Body: { stallId, message, history: [...] }
router.post('/chat', aiCtrl.chat);

// Smart item suggestions based on current cart
// Body: { stallId, cartItems: [...] }
router.post('/suggest', aiCtrl.suggest);

module.exports = router;

// controllers/aiController.js
const { chatWithMenu, getSuggestions } = require('../services/openai');
const MenuItem = require('../models/MenuItem');
const Stall    = require('../models/Stall');
const db       = require('../config/db');

// POST /ai/chat
exports.chat = async (req, res) => {
  try {
    const { stallId, message, history } = req.body;
    if (!stallId || !message) return res.status(400).json({ error: 'stallId and message required' });

    const stall     = await Stall.findById(stallId);
    const menuItems = await MenuItem.getStallMenuSummary(stallId);

    const { reply, tokens } = await chatWithMenu(
      stall?.name || 'Canteen',
      menuItems,
      message,
      history || []
    );

    // Log (fire and forget)
    db.query(
      'INSERT INTO ai_logs (user_id, stall_id, log_type, query, response, tokens_used) VALUES (?,?,?,?,?,?)',
      [req.user?.id || null, stallId, 'chatbot', message, reply, tokens]
    ).catch(() => {});

    return res.json({ reply });
  } catch (err) {
    return res.status(500).json({ error: 'AI service unavailable: ' + err.message });
  }
};

// POST /ai/suggest  (requires auth, called from cart page)
exports.suggest = async (req, res) => {
  try {
    const { stallId, cartItems } = req.body;
    const allItems = await MenuItem.findByStall(stallId);
    const suggestions = await getSuggestions(cartItems, allItems);
    return res.json({ suggestions });
  } catch (err) {
    return res.json({ suggestions: [] }); // graceful fallback
  }
};
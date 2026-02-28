// controllers/cartController.js
const Cart     = require('../models/Cart');
const MenuItem = require('../models/MenuItem');
const { getSuggestions } = require('../services/openai');

// GET /cart
exports.cartPage = async (req, res, next) => {
  try {
    const items       = await Cart.getByUser(req.user.id);
    const total       = items.reduce((s, i) => s + parseFloat(i.subtotal), 0);
    const suggestions = items.length > 0
      ? await getSuggestions(items, items.length > 0
          ? await MenuItem.findByStall(items[0].stall_id)
          : []).catch(() => [])
      : [];
    res.render('cart', {
      title: 'Your Cart',
      items, total, suggestions,
      user: req.user,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) { next(err); }
};

// POST /cart/add
exports.addItem = async (req, res) => {
  try {
    const { menuItemId, quantity } = req.body;
    const item = await MenuItem.findById(menuItemId);
    if (!item || !item.is_available) {
      return res.status(400).json({ error: 'Item not available' });
    }

    // Ensure single-stall cart
    const cartItems = await Cart.getByUser(req.user.id);
    if (cartItems.length > 0 && cartItems[0].stall_id !== item.stall_id) {
      return res.status(400).json({ error: 'Your cart already has items from another stall. Clear cart first.' });
    }

    await Cart.addItem(req.user.id, menuItemId, parseInt(quantity) || 1);
    const count = await cartItemCount(req.user.id);
    return res.json({ success: true, cartCount: count });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /cart/update
exports.updateItem = async (req, res) => {
  try {
    const { menuItemId, quantity } = req.body;
    await Cart.setQuantity(req.user.id, menuItemId, parseInt(quantity));
    const items = await Cart.getByUser(req.user.id);
    const total = items.reduce((s, i) => s + parseFloat(i.subtotal), 0);
    return res.json({ success: true, total: total.toFixed(2), cartCount: items.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /cart/remove
exports.removeItem = async (req, res) => {
  try {
    await Cart.removeItem(req.user.id, req.body.menuItemId);
    const items = await Cart.getByUser(req.user.id);
    const total = items.reduce((s, i) => s + parseFloat(i.subtotal), 0);
    return res.json({ success: true, total: total.toFixed(2), cartCount: items.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /cart/clear
exports.clearCart = async (req, res) => {
  try {
    await Cart.clearCart(req.user.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Helper
async function cartItemCount(userId) {
  const items = await Cart.getByUser(userId);
  return items.reduce((s, i) => s + i.quantity, 0);
}
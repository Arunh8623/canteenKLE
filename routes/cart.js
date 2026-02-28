// routes/cart.js — Cart management (login required)
const express  = require('express');
const router   = express.Router();
const cartCtrl = require('../controllers/cartController');
const { requireAuth } = require('../middleware/firebaseAuth');

// All cart routes require login
router.use(requireAuth);

// View cart page
router.get('/', cartCtrl.cartPage);

// Add item to cart (called via AJAX from stall menu page)
router.post('/add', cartCtrl.addItem);

// Update item quantity (called via AJAX from cart page)
router.post('/update', cartCtrl.updateItem);

// Remove single item from cart
router.post('/remove', cartCtrl.removeItem);

// Clear entire cart
router.post('/clear', cartCtrl.clearCart);

// GET cart item count (for navbar badge)
router.get('/count', async (req, res) => {
  try {
    const Cart = require('../models/Cart');
    const items = await Cart.getByUser(req.user.id);
    const count = items.reduce((s, i) => s + i.quantity, 0);
    res.json({ count });
  } catch { res.json({ count: 0 }); }
});

module.exports = router;

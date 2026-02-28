// routes/order.js — Order placement, tracking, history (login required)
const express    = require('express');
const router     = express.Router();
const orderCtrl  = require('../controllers/orderController');
const { requireAuth } = require('../middleware/firebaseAuth');

// All order routes require login
router.use(requireAuth);

// Step 1: Create a Razorpay order (called via AJAX before payment popup)
router.post('/create-razorpay-order', orderCtrl.createRazorpayOrder);

// Step 2: After payment succeeds in browser, confirm + save order in DB
router.post('/confirm', orderCtrl.confirmOrder);

// Order success / bill page (shown after successful payment)
router.get('/success/:uuid', orderCtrl.orderSuccess);

// Live order tracking page
router.get('/track/:uuid', orderCtrl.trackOrder);

// User's past order history
router.get('/my-orders', orderCtrl.myOrders);

module.exports = router;

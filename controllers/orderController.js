// controllers/orderController.js
const Cart   = require('../models/Cart');
const Order  = require('../models/Order');
const Stall  = require('../models/Stall');
const db     = require('../config/db');
const { createOrder }  = require('../services/razorpay');
const { sendSMS, templates } = require('../services/fast2sms');
const socketConfig = require('../config/socket');

// POST /order/create-razorpay-order — Step 1: create Razorpay order
exports.createRazorpayOrder = async (req, res) => {
  try {
    const validation = await Cart.validateSingleStall(req.user.id);
    if (!validation.valid) return res.status(400).json({ error: validation.message });

    const cartItems = await Cart.getByUser(req.user.id);
    const total     = cartItems.reduce((s, i) => s + parseFloat(i.subtotal), 0);

    const rzOrder = await createOrder(total, `user_${req.user.id}_${Date.now()}`);

    return res.json({
      razorpayOrderId: rzOrder.id,
      amount:          rzOrder.amount,
      currency:        rzOrder.currency,
      keyId:           process.env.RAZORPAY_KEY_ID,
      user: {
        name:  req.user.name,
        email: req.user.email,
        phone: req.user.phone || '',
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /order/confirm — Step 2: verify payment + create order record
exports.confirmOrder = async (req, res) => {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, specialNote } = req.body;

    const { verifyPayment } = require('../services/razorpay');
    if (!verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    const cartItems = await Cart.getByUser(req.user.id);
    if (!cartItems.length) return res.status(400).json({ error: 'Cart is empty' });

    const total   = cartItems.reduce((s, i) => s + parseFloat(i.subtotal), 0);
    const stallId = cartItems[0].stall_id;

    // Create order with priority
    const { id: orderId, uuid } = await Order.create({
      userId:         req.user.id,
      stallId,
      totalAmount:    total,
      priority:       req.user.role === 'lecturer' ? 'high' : 'normal',
      razorpayOrderId,
      specialNote,
    });

    await Order.markPaid(orderId, razorpayPaymentId);

    // Add order items (snapshot)
    await Order.addItems(orderId, cartItems.map(i => ({
      menuItemId:    i.menu_item_id,
      itemName:      i.name,
      quantity:      i.quantity,
      priceAtOrder:  i.price,
    })));

    // Clear cart
    await Cart.clearCart(req.user.id);

    // Get queue position
    const queuePos = await Order.getQueuePosition(orderId);

    // Notify stall admin via socket
    const orderDetails = await Order.findById(orderId);
    try { socketConfig.notifyAdmin(stallId, { ...orderDetails, queue_position: queuePos }); } catch {}

    // Send confirmation SMS if user has phone
    if (req.user.phone) {
      const stall = await Stall.findById(stallId);
      sendSMS(req.user.phone, templates.orderConfirmed(uuid, stall.name, queuePos)).catch(console.warn);
    }

    return res.json({ success: true, orderUUID: uuid, queuePosition: queuePos });
  } catch (err) {
    console.error('Order confirm error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// GET /order/success/:uuid
exports.orderSuccess = async (req, res, next) => {
  try {
    const order = await Order.findByUUID(req.params.uuid);
    if (!order) return res.status(404).render('error', { title: '404', message: 'Order not found', user: req.user });
    if (order.user_id !== req.user.id) return res.status(403).render('error', { title: 'Forbidden', message: 'Access denied', user: req.user });

    const items    = await Order.getItems(order.id);
    const queuePos = await Order.getQueuePosition(order.id);

    res.render('order-success', { title: 'Order Confirmed!', order, items, queuePos, user: req.user });
  } catch (err) { next(err); }
};

// GET /order/track/:uuid
exports.trackOrder = async (req, res, next) => {
  try {
    const order = await Order.findByUUID(req.params.uuid);
    if (!order) return res.status(404).render('error', { title: '404', message: 'Order not found', user: req.user });

    const items    = await Order.getItems(order.id);
    const queuePos = ['pending','preparing'].includes(order.status)
      ? await Order.getQueuePosition(order.id) : null;

    res.render('order-track', { title: 'Track Order', order, items, queuePos, user: req.user });
  } catch (err) { next(err); }
};

// GET /orders — User's order history
exports.myOrders = async (req, res, next) => {
  try {
    const orders = await Order.getUserOrders(req.user.id);
    res.render('my-orders', { title: 'My Orders', orders, user: req.user });
  } catch (err) { next(err); }
};
// services/razorpay.js — Razorpay payment integration
const Razorpay = require('razorpay');
const crypto   = require('crypto');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create a Razorpay order
const createOrder = async (amountInRupees, receiptId) => {
  const order = await razorpay.orders.create({
    amount:   Math.round(amountInRupees * 100), // paise
    currency: 'INR',
    receipt:  receiptId,
    notes:    { source: 'KLE Canteen App' },
  });
  return order;
};

// Verify payment signature from webhook/callback
const verifyPayment = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  const body      = razorpayOrderId + '|' + razorpayPaymentId;
  const expected  = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expected === razorpaySignature;
};

module.exports = { createOrder, verifyPayment, razorpay };
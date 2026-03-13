// services/fast2sms.js — SMS via Fast2SMS Quick Route (works instantly, no DLT needed)
const axios = require('axios');

const sendSMS = async (phone, message) => {
  try {
    const cleanPhone = phone.replace(/^\+91/, '').replace(/\D/g, '');

    const response = await axios.get('https://www.fast2sms.com/dev/bulkV2', {
      params: {
        authorization: process.env.FAST2SMS_API_KEY,
        message:       message,
        language:      'english',
        route:         'q',           // Quick route — works instantly, no DLT needed
        numbers:       cleanPhone,
      },
      headers: { 'cache-control': 'no-cache' },
      timeout: 10000,
    });

    if (response.data?.return === true) {
      console.log(`📱 SMS sent to ${cleanPhone}:`, response.data);
      return { success: true, data: response.data };
    } else {
      console.warn('⚠️ Fast2SMS response:', response.data);
      return { success: false, error: response.data?.message || 'Unknown error' };
    }
  } catch (err) {
    console.error('❌ Fast2SMS error:', err.response?.data || err.message);
    return { success: false, error: err.message };
  }
};

const templates = {
  orderReady: (orderUUID, stallName) =>
    `Your order #${orderUUID.slice(0,8).toUpperCase()} at ${stallName} is READY! Please collect it from the counter. - KLE Canteen`,

  orderConfirmed: (orderUUID, stallName, queuePos) =>
    `Order #${orderUUID.slice(0,8).toUpperCase()} confirmed at ${stallName}! Queue position: #${queuePos}. - KLE Canteen`,

  orderCancelled: (orderUUID) =>
    `Order #${orderUUID.slice(0,8).toUpperCase()} has been cancelled. Refund will be processed if payment was made. - KLE Canteen`,
};

module.exports = { sendSMS, templates };
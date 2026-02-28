// services/fast2sms.js — SMS via Fast2SMS API
const axios = require('axios');

const sendSMS = async (phone, message) => {
  try {
    // Fast2SMS expects 10-digit number (no country code)
    const cleanPhone = phone.replace(/^\+91/, '').replace(/\D/g, '');
    
    const response = await axios.get('https://www.fast2sms.com/dev/bulkV2', {
      params: {
        authorization: process.env.FAST2SMS_API_KEY,
        message:       message,
        language:      'english',
        route:         'q',          // quick transactional route
        numbers:       cleanPhone,
      },
      headers: { 'cache-control': 'no-cache' },
      timeout: 10000,
    });

    if (response.data?.return === true) {
      console.log(`📱 SMS sent to ${cleanPhone}`);
      return { success: true, data: response.data };
    } else {
      console.warn('⚠️ Fast2SMS returned non-success:', response.data);
      return { success: false, error: response.data?.message || 'Unknown error' };
    }
  } catch (err) {
    console.error('❌ Fast2SMS error:', err.message);
    return { success: false, error: err.message };
  }
};

// Pre-built message templates
const templates = {
  orderReady: (orderUUID, stallName) =>
    `Your order #${orderUUID.slice(0,8).toUpperCase()} at ${stallName} is READY! Please collect it from the counter. - KLE Canteen`,

  orderConfirmed: (orderUUID, stallName, queuePos) =>
    `Order #${orderUUID.slice(0,8).toUpperCase()} confirmed at ${stallName}! You are #${queuePos} in queue. - KLE Canteen`,

  orderCancelled: (orderUUID) =>
    `Order #${orderUUID.slice(0,8).toUpperCase()} has been cancelled. If payment was made, refund will be processed. - KLE Canteen`,
};

module.exports = { sendSMS, templates };
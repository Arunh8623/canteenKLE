// routes/auth.js — OTP Email Auth
const express  = require('express');
const router   = express.Router();
const authCtrl = require('../controllers/authController');
const { requireAuth } = require('../middleware/firebaseAuth');

router.get('/login',         authCtrl.loginPage);
router.post('/send-otp',     authCtrl.sendOtp);
router.post('/verify-otp',   authCtrl.verifyOtp);
router.post('/update-phone', requireAuth, authCtrl.updatePhone);
router.post('/dummy-login',  authCtrl.dummyLogin);
router.post('/logout',       authCtrl.logout);

// Legacy — kept for compat
router.post('/verify',       authCtrl.verifyToken);

module.exports = router;
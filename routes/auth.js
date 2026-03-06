// routes/auth.js — Firebase Google auth + phone collection
const express  = require('express');
const router   = express.Router();
const authCtrl = require('../controllers/authController');
const { requireAuth } = require('../middleware/firebaseAuth');

router.get('/login', authCtrl.loginPage);
router.post('/dummy-login', authCtrl.dummyLogin);
router.post('/verify', authCtrl.verifyToken);
router.post('/update-phone', requireAuth, authCtrl.updatePhone);
router.post('/logout', authCtrl.logout);

module.exports = router;

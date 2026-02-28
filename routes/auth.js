// routes/auth.js — Firebase Google auth + phone collection
const express  = require('express');
const router   = express.Router();
const authCtrl = require('../controllers/authController');
const { requireAuth } = require('../middleware/firebaseAuth');

// Show the login page
router.get('/login', authCtrl.loginPage);

// Called from browser after Firebase Google sign-in succeeds
// Verifies the Firebase ID token on the server side
router.post('/verify', authCtrl.verifyToken);

// Let logged-in users save/update their phone number
router.post('/update-phone', requireAuth, authCtrl.updatePhone);

// Logout — destroys session
router.post('/logout', authCtrl.logout);

module.exports = router;

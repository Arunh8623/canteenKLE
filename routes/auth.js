const express  = require('express');
const router   = express.Router();
const authCtrl = require('../controllers/authController');
const { requireAuth } = require('../middleware/firebaseAuth');

router.get('/login',          authCtrl.loginPage);
router.get('/register',       authCtrl.registerPage);
router.post('/login',         authCtrl.login);
router.post('/register',      authCtrl.register);
router.post('/update-phone',  requireAuth, authCtrl.updatePhone);
router.post('/dummy-login',   authCtrl.dummyLogin);
router.post('/logout',        authCtrl.logout);
router.post('/verify',        authCtrl.verifyToken);

module.exports = router;
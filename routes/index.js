// routes/index.js — Public routes (no login needed to browse)
const express     = require('express');
const router      = express.Router();
const canteenCtrl = require('../controllers/canteenController');

// Home page — shows both canteens (HUB and RHK)
router.get('/', canteenCtrl.home);

// Canteen detail page — shows all stalls inside that canteen
router.get('/canteen/:id', canteenCtrl.canteenPage);

// Stall menu page — shows full menu with categories
router.get('/stall/:id', canteenCtrl.stallPage);

module.exports = router;
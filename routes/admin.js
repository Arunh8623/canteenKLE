// routes/admin.js — Stall admin panel (authenticated by phone OTP)
const express   = require('express');
const router    = express.Router();
const adminCtrl = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/adminAuth');
const multer    = require('multer');
const path      = require('path');
const fs        = require('fs');

// ── Make sure uploads/ folder exists ──────────────────────────
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ── Multer config for menu image uploads ──────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `menu_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },   // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
    }
  },
});

// ── Auth routes (public) ───────────────────────────────────────

// Show admin login page (phone OTP)
router.get('/login', adminCtrl.loginPage);

// Verify Firebase phone OTP token, create admin session
router.post('/verify-phone', adminCtrl.verifyPhone);

// ── Protected admin routes ────────────────────────────────────

// Logout
router.post('/logout', requireAdmin, adminCtrl.logout);

// Dashboard — live order queue (pending / preparing / ready)
router.get('/dashboard', requireAdmin, adminCtrl.dashboard);

// Update order status (pending → preparing → ready → delivered)
router.post('/order/:id/status', requireAdmin, adminCtrl.updateStatus);

// Manually trigger SMS notification to customer
router.post('/order/:id/notify', requireAdmin, adminCtrl.sendNotification);

// ── Menu management ───────────────────────────────────────────

// View all menu items
router.get('/menu', requireAdmin, adminCtrl.menuPage);

// Add a single menu item manually
router.post('/menu/add', requireAdmin, adminCtrl.addMenuItem);

// Update an existing menu item
router.post('/menu/:id/update', requireAdmin, adminCtrl.updateMenuItem);

// Toggle item availability on/off
router.post('/menu/:id/toggle', requireAdmin, adminCtrl.toggleItem);

// Delete a menu item
router.post('/menu/:id/delete', requireAdmin, adminCtrl.deleteMenuItem);

// Upload handwritten/printed menu image → OpenAI Vision extracts items
router.post('/menu/upload-image', requireAdmin, upload.single('menuImage'), adminCtrl.uploadMenuImage);

// Save bulk-extracted menu items from OCR result
router.post('/menu/bulk-insert', requireAdmin, adminCtrl.bulkInsertMenu);

// ── Bill printing (admin only) ────────────────────────────────
router.get('/bill/:uuid', requireAdmin, adminCtrl.printBill);

module.exports = router;

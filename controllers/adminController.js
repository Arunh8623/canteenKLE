// controllers/adminController.js
const admin          = require('../config/firebase');
const Stall          = require('../models/Stall');
const Order          = require('../models/Order');
const MenuItem       = require('../models/MenuItem');
const db             = require('../config/db');
const { sendSMS, templates }      = require('../services/fast2sms');
const { extractMenuFromImage }    = require('../services/openai');
const socketConfig   = require('../config/socket');
const fs             = require('fs');

// GET /admin/login
exports.loginPage = async (req, res) => {
  if (req.adminStall) return res.redirect('/admin/dashboard');
  const [stalls] = await require('../config/db').query('SELECT id, name FROM stalls WHERE is_active = TRUE ORDER BY id');
  res.render('admin/login', { title: 'Admin Login', error: req.query.error || null, stalls });
};

// POST /admin/verify-phone — verify Firebase phone OTP token
exports.verifyPhone = async (req, res) => {
  try {
    const { idToken } = req.body;
    const decoded = await admin.auth().verifyIdToken(idToken);
    const phone   = decoded.phone_number?.replace('+91', '');

    if (!phone) return res.status(400).json({ error: 'No phone number in token' });

    const stall = await Stall.findByAdminPhone(phone);
    if (!stall) return res.status(403).json({ error: 'This phone is not registered as a stall admin.' });

    req.session.adminStallId = stall.id;
    return res.json({ success: true, stallName: stall.name });
  } catch (err) {
    return res.status(401).json({ error: 'Verification failed: ' + err.message });
  }
};

// POST /admin/dummy-login — DEV ONLY, pick a stall directly
exports.dummyAdminLogin = async (req, res) => {
  try {
    const { stall_id } = req.body;
    const stall = await Stall.findById(stall_id);
    if (!stall) return res.redirect('/admin/login?error=Stall+not+found');
    req.session.adminStallId = stall.id;
    return res.redirect('/admin/dashboard');
  } catch (err) {
    return res.redirect('/admin/login?error=' + encodeURIComponent(err.message));
  }
};

// GET /admin/dashboard
exports.dashboard = async (req, res, next) => {
  try {
    const stallId = req.adminStall.id;
    const pending   = await Order.getStallOrders(stallId, 'pending');
    const preparing = await Order.getStallOrders(stallId, 'preparing');
    const ready     = await Order.getStallOrders(stallId, 'ready');

    // Attach items to each order
    const attachItems = async (orders) => {
      for (const o of orders) { o.items = await Order.getItems(o.id); }
      return orders;
    };

    res.render('admin/dashboard', {
      title:      `${req.adminStall.name} — Dashboard`,
      stall:      req.adminStall,
      pending:    await attachItems(pending),
      preparing:  await attachItems(preparing),
      ready:      await attachItems(ready),
    });
  } catch (err) { next(err); }
};

// POST /admin/order/:id/status — update order status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order      = await Order.findById(req.params.id);
    if (!order || order.stall_id !== req.adminStall.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Order.updateStatus(order.id, status);

    // Notify user via socket
    try { socketConfig.notifyUser(order.user_id, { orderId: order.id, uuid: order.uuid, status }); } catch {}

    // If ready, send SMS if possible
    if (status === 'ready' && order.user_phone) {
      sendSMS(order.user_phone, templates.orderReady(order.uuid, req.adminStall.name)).catch(console.warn);
      // Log notification
      await db.query(
        `INSERT INTO notifications (order_id, type, message, status) VALUES (?,?,?,'sent')`,
        [order.id, 'sms', templates.orderReady(order.uuid, req.adminStall.name)]
      );
    }

    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: err.message }); }
};

// POST /admin/order/:id/notify — manual SMS trigger
exports.sendNotification = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order || order.stall_id !== req.adminStall.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!order.user_phone) {
      return res.status(400).json({ error: 'Customer phone number not available' });
    }

    const message = templates.orderReady(order.uuid, req.adminStall.name);
    const result  = await sendSMS(order.user_phone, message);

    await db.query(
      `INSERT INTO notifications (order_id, type, message, status) VALUES (?,?,'sms',?)`,
      [order.id, 'sms', result.success ? 'sent' : 'failed']
    );

    return res.json({ success: result.success, error: result.error });
  } catch (err) { return res.status(500).json({ error: err.message }); }
};

// GET /admin/menu
exports.menuPage = async (req, res, next) => {
  try {
    const items   = await MenuItem.findByStall(req.adminStall.id);
    const grouped = await MenuItem.findByStallGrouped(req.adminStall.id);
    res.render('admin/menu-manage', {
      title:   `Manage Menu — ${req.adminStall.name}`,
      stall:   req.adminStall,
      items,
      grouped,
    });
  } catch (err) { next(err); }
};

// POST /admin/menu/add
exports.addMenuItem = async (req, res) => {
  try {
    const { name, description, price, category, is_veg, prep_time_mins } = req.body;
    await MenuItem.create({
      stall_id:      req.adminStall.id,
      name, description, price: parseFloat(price),
      category,
      is_veg:        is_veg === 'true' || is_veg === true,
      prep_time_mins: parseInt(prep_time_mins) || 10,
    });
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: err.message }); }
};

// POST /admin/menu/:id/update
exports.updateMenuItem = async (req, res) => {
  try {
    const { name, description, price, category, is_available, is_veg, prep_time_mins } = req.body;
    await MenuItem.update(req.params.id, {
      name, description,
      price:         parseFloat(price),
      image_url:     req.body.image_url || null,
      category,
      is_available:  is_available === 'true',
      is_veg:        is_veg === 'true',
      prep_time_mins: parseInt(prep_time_mins),
    });
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: err.message }); }
};

// POST /admin/menu/:id/toggle
exports.toggleItem = async (req, res) => {
  try {
    await MenuItem.toggleAvailability(req.params.id);
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: err.message }); }
};

// POST /admin/menu/:id/delete
exports.deleteMenuItem = async (req, res) => {
  try {
    await MenuItem.delete(req.params.id);
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: err.message }); }
};

// POST /admin/menu/upload-image — OCR menu via OpenAI vision
exports.uploadMenuImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const items = await extractMenuFromImage(req.file.path);

    // Clean up uploaded file
    fs.unlink(req.file.path, () => {});

    return res.json({ success: true, items });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(500).json({ error: 'Could not extract menu: ' + err.message });
  }
};

// POST /admin/menu/bulk-insert — Save OCR-extracted items
exports.bulkInsertMenu = async (req, res) => {
  try {
    const { items } = req.body; // Array from OCR
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'No items provided' });
    }
    for (const item of items) {
      await MenuItem.create({
        stall_id:      req.adminStall.id,
        name:          item.name,
        description:   item.description || '',
        price:         parseFloat(item.price),
        category:      item.category || 'Other',
        is_veg:        item.is_veg ?? true,
        prep_time_mins: 10,
      });
    }
    return res.json({ success: true, inserted: items.length });
  } catch (err) { return res.status(500).json({ error: err.message }); }
};

// GET /admin/bill/:uuid — Print bill (admin only)
exports.printBill = async (req, res, next) => {
  try {
    const order = await Order.findByUUID(req.params.uuid);
    if (!order || order.stall_id !== req.adminStall.id) {
      return res.status(403).render('error', { title: 'Forbidden', message: 'Access denied', user: null });
    }
    const items = await Order.getItems(order.id);
    res.render('admin/bill-print', { title: 'Bill', order, items, stall: req.adminStall });
  } catch (err) { next(err); }
};

// POST /admin/logout
exports.logout = (req, res) => {
  delete req.session.adminStallId;
  res.redirect('/admin/login');
};

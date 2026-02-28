// models/Order.js
const db    = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Order {
  static async create({ userId, stallId, totalAmount, priority, razorpayOrderId, specialNote }) {
    const uuid = uuidv4();
    const [result] = await db.query(
      `INSERT INTO orders
         (uuid, user_id, stall_id, total_amount, priority, razorpay_order_id, special_note, payment_status)
       VALUES (?,?,?,?,?,?,?,'pending')`,
      [uuid, userId, stallId, totalAmount, priority || 'normal', razorpayOrderId, specialNote || null]
    );
    return { id: result.insertId, uuid };
  }

  static async addItems(orderId, items) {
    // items = [{ menuItemId, itemName, quantity, priceAtOrder }]
    const values = items.map(i => [orderId, i.menuItemId, i.itemName, i.quantity, i.priceAtOrder]);
    await db.query(
      `INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, price_at_order)
       VALUES ?`,
      [values]
    );
  }

  static async markPaid(orderId, paymentId) {
    await db.query(
      `UPDATE orders SET payment_status='paid', payment_id=?, status='pending'
       WHERE id=?`,
      [paymentId, orderId]
    );
  }

  static async updateStatus(orderId, status) {
    await db.query('UPDATE orders SET status=? WHERE id=?', [status, orderId]);
  }

  static async findByUUID(uuid) {
    const [rows] = await db.query(
      `SELECT o.*,
              u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
              s.name AS stall_name, s.admin_phone,
              c.name AS canteen_name
       FROM orders o
       JOIN users u ON o.user_id = u.id
       JOIN stalls s ON o.stall_id = s.id
       JOIN canteens c ON s.canteen_id = c.id
       WHERE o.uuid = ?`,
      [uuid]
    );
    return rows[0] || null;
  }

  static async findById(id) {
    const [rows] = await db.query(
      `SELECT o.*,
              u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
              s.name AS stall_name, c.name AS canteen_name
       FROM orders o
       JOIN users u ON o.user_id = u.id
       JOIN stalls s ON o.stall_id = s.id
       JOIN canteens c ON s.canteen_id = c.id
       WHERE o.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async getItems(orderId) {
    const [rows] = await db.query(
      `SELECT oi.*, mi.image_url FROM order_items oi
       LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE oi.order_id = ?`,
      [orderId]
    );
    return rows;
  }

  static async getUserOrders(userId) {
    const [rows] = await db.query(
      `SELECT o.*, s.name AS stall_name, c.name AS canteen_name
       FROM orders o
       JOIN stalls s ON o.stall_id = s.id
       JOIN canteens c ON s.canteen_id = c.id
       WHERE o.user_id = ? AND o.payment_status = 'paid'
       ORDER BY o.created_at DESC`,
      [userId]
    );
    return rows;
  }

  // Get all orders for admin dashboard (with items)
  static async getStallOrders(stallId, statusFilter = null) {
    let query = `
      SELECT o.*,
             u.name AS user_name, u.email AS user_email, u.phone AS user_phone, u.role AS user_role
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.stall_id = ? AND o.payment_status = 'paid'
    `;
    const params = [stallId];
    if (statusFilter) { query += ' AND o.status = ?'; params.push(statusFilter); }
    query += ' ORDER BY o.priority DESC, o.created_at ASC';  // high priority first
    const [rows] = await db.query(query, params);
    return rows;
  }

  // ─────────────────────────────────────────────────────────────
  // PRIORITY QUEUE POSITION
  // Lecturers jump ahead of students in queue
  // ─────────────────────────────────────────────────────────────
  static async getQueuePosition(orderId) {
    const [orderRows] = await db.query(
      'SELECT stall_id, priority, created_at FROM orders WHERE id = ?',
      [orderId]
    );
    if (!orderRows[0]) return null;
    const { stall_id, priority, created_at } = orderRows[0];

    let countQuery, params;

    if (priority === 'high') {
      // Lecturer: count only OTHER lecturer orders placed before this one
      countQuery = `
        SELECT COUNT(*) AS position FROM orders
        WHERE stall_id = ? AND status IN ('pending','preparing')
        AND payment_status = 'paid'
        AND priority = 'high'
        AND created_at < ?
        AND id != ?
      `;
      params = [stall_id, created_at, orderId];
    } else {
      // Student: count all lecturer orders + student orders placed before this one
      countQuery = `
        SELECT COUNT(*) AS position FROM orders
        WHERE stall_id = ? AND status IN ('pending','preparing')
        AND payment_status = 'paid'
        AND (
          priority = 'high'
          OR (priority = 'normal' AND created_at < ?)
        )
        AND id != ?
      `;
      params = [stall_id, created_at, orderId];
    }

    const [result] = await db.query(countQuery, params);
    return (result[0]?.position || 0) + 1; // 1-indexed
  }
}

module.exports = Order;
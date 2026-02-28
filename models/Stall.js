// models/Stall.js
const db = require('../config/db');

class Stall {
  static async findById(id) {
    const [rows] = await db.query(
      `SELECT s.*, c.name AS canteen_name FROM stalls s
       JOIN canteens c ON s.canteen_id = c.id
       WHERE s.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async findByCanteen(canteenId) {
    const [rows] = await db.query(
      'SELECT * FROM stalls WHERE canteen_id = ? AND is_active = TRUE ORDER BY id',
      [canteenId]
    );
    return rows;
  }

  static async findByAdminPhone(phone) {
    const [rows] = await db.query(
      'SELECT * FROM stalls WHERE admin_phone = ?',
      [phone]
    );
    return rows[0] || null;
  }

  static async getActiveOrderCount(stallId) {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS count FROM orders
       WHERE stall_id = ? AND status IN ('pending','preparing')
       AND payment_status = 'paid'`,
      [stallId]
    );
    return rows[0].count;
  }
}

module.exports = Stall;
// models/Cart.js
const db = require('../config/db');

class Cart {
  static async getByUser(userId) {
    const [rows] = await db.query(
      `SELECT ci.id, ci.quantity, ci.menu_item_id,
              mi.name, mi.price, mi.image_url, mi.is_available, mi.prep_time_mins,
              mi.stall_id, s.name AS stall_name, s.canteen_id,
              (ci.quantity * mi.price) AS subtotal
       FROM cart_items ci
       JOIN menu_items mi ON ci.menu_item_id = mi.id
       JOIN stalls s ON mi.stall_id = s.id
       WHERE ci.user_id = ?
       ORDER BY ci.added_at`,
      [userId]
    );
    return rows;
  }

  static async addItem(userId, menuItemId, quantity = 1) {
    await db.query(
      `INSERT INTO cart_items (user_id, menu_item_id, quantity)
       VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
      [userId, menuItemId, quantity, quantity]
    );
  }

  static async setQuantity(userId, menuItemId, quantity) {
    if (quantity <= 0) {
      return Cart.removeItem(userId, menuItemId);
    }
    await db.query(
      `INSERT INTO cart_items (user_id, menu_item_id, quantity)
       VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE quantity = ?`,
      [userId, menuItemId, quantity, quantity]
    );
  }

  static async removeItem(userId, menuItemId) {
    await db.query(
      'DELETE FROM cart_items WHERE user_id = ? AND menu_item_id = ?',
      [userId, menuItemId]
    );
  }

  static async clearCart(userId) {
    await db.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
  }

  static async getTotal(userId) {
    const [rows] = await db.query(
      `SELECT SUM(ci.quantity * mi.price) AS total
       FROM cart_items ci
       JOIN menu_items mi ON ci.menu_item_id = mi.id
       WHERE ci.user_id = ?`,
      [userId]
    );
    return rows[0]?.total || 0;
  }

  // Validate all items belong to the same stall (one stall per order)
  static async validateSingleStall(userId) {
    const [rows] = await db.query(
      `SELECT DISTINCT mi.stall_id FROM cart_items ci
       JOIN menu_items mi ON ci.menu_item_id = mi.id
       WHERE ci.user_id = ?`,
      [userId]
    );
    if (rows.length === 0) return { valid: false, message: 'Cart is empty' };
    if (rows.length > 1)  return { valid: false, message: 'All items must be from the same stall' };
    return { valid: true, stallId: rows[0].stall_id };
  }
}

module.exports = Cart;
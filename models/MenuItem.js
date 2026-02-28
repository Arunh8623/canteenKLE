// models/MenuItem.js
const db = require('../config/db');

class MenuItem {
  static async findByStall(stallId) {
    const [rows] = await db.query(
      `SELECT * FROM menu_items WHERE stall_id = ?
       ORDER BY category, sort_order, name`,
      [stallId]
    );
    return rows;
  }

  static async findByStallGrouped(stallId) {
    const items = await MenuItem.findByStall(stallId);
    const grouped = {};
    for (const item of items) {
      const cat = item.category || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }
    return grouped;
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM menu_items WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async create({ stall_id, name, description, price, image_url, category, is_veg, prep_time_mins }) {
    const [result] = await db.query(
      `INSERT INTO menu_items (stall_id, name, description, price, image_url, category, is_veg, prep_time_mins)
       VALUES (?,?,?,?,?,?,?,?)`,
      [stall_id, name, description || null, price, image_url || null, category || 'Other', is_veg ?? true, prep_time_mins || 10]
    );
    return result.insertId;
  }

  static async update(id, { name, description, price, image_url, category, is_available, is_veg, prep_time_mins }) {
    await db.query(
      `UPDATE menu_items SET name=?, description=?, price=?, image_url=?,
       category=?, is_available=?, is_veg=?, prep_time_mins=?
       WHERE id=?`,
      [name, description, price, image_url, category, is_available, is_veg, prep_time_mins, id]
    );
  }

  static async toggleAvailability(id) {
    await db.query(
      'UPDATE menu_items SET is_available = NOT is_available WHERE id = ?',
      [id]
    );
  }

  static async delete(id) {
    await db.query('DELETE FROM menu_items WHERE id = ?', [id]);
  }

  // For AI chatbot context — return all items for a stall as summary
  static async getStallMenuSummary(stallId) {
    const [rows] = await db.query(
      `SELECT name, price, category, is_veg, is_available, description
       FROM menu_items WHERE stall_id = ? ORDER BY category, price`,
      [stallId]
    );
    return rows;
  }
}

module.exports = MenuItem;
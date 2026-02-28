// models/Canteen.js
const db = require('../config/db');

class Canteen {
  static async findAll() {
    const [rows] = await db.query(
      'SELECT * FROM canteens WHERE is_active = TRUE ORDER BY id'
    );
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM canteens WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async findWithStalls(id) {
    const canteen = await Canteen.findById(id);
    if (!canteen) return null;
    const [stalls] = await db.query(
      'SELECT * FROM stalls WHERE canteen_id = ? AND is_active = TRUE ORDER BY id',
      [id]
    );
    canteen.stalls = stalls;
    return canteen;
  }
}

module.exports = Canteen;
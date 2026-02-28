// models/User.js
const db = require('../config/db');

class User {
  // Detect role from email pattern
  static detectRole(email) {
    // USN format: digits+letters@kletech.ac.in  e.g. 01fe24bci106@kletech.ac.in
    const studentPattern = /^[a-z0-9]+@kletech\.ac\.in$/i;
    // Lecturer format: firstname.lastname@kletech.ac.in  e.g. prakash.hegde@kletech.ac.in
    const lecturerPattern = /^[a-z]+\.[a-z]+@kletech\.ac\.in$/i;

    if (lecturerPattern.test(email)) return 'lecturer';
    if (studentPattern.test(email))  return 'student';
    return 'student'; // default fallback
  }

  static async findByFirebaseUID(uid) {
    const [rows] = await db.query('SELECT * FROM users WHERE firebase_uid = ?', [uid]);
    return rows[0] || null;
  }

  static async findByEmail(email) {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async create({ firebase_uid, name, email, phone, profile_pic }) {
    const role = User.detectRole(email);
    const [result] = await db.query(
      'INSERT INTO users (firebase_uid, name, email, phone, role, profile_pic) VALUES (?,?,?,?,?,?)',
      [firebase_uid, name, email, phone || null, role, profile_pic || null]
    );
    return { id: result.insertId, firebase_uid, name, email, phone, role, profile_pic };
  }

  static async updatePhone(userId, phone) {
    await db.query('UPDATE users SET phone = ? WHERE id = ?', [phone, userId]);
  }

  static async upsert({ firebase_uid, name, email, profile_pic }) {
    let user = await User.findByFirebaseUID(firebase_uid);
    if (!user) {
      user = await User.create({ firebase_uid, name, email, profile_pic });
    }
    return user;
  }
}

module.exports = User;
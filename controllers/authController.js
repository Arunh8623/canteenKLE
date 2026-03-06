// controllers/authController.js
const { verifyFirebaseToken } = require('../middleware/firebaseAuth');
const User = require('../models/User');

// GET /auth/login
exports.loginPage = (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('auth/login', { title: 'Login — KLE Canteen', user: null, error: null });
};

// POST /auth/dummy-login — DEV ONLY, bypass Firebase
exports.dummyLogin = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.endsWith('@kletech.ac.in')) {
      return res.redirect('/auth/login?error=Only @kletech.ac.in emails allowed');
    }
    const name = email.split('@')[0];
    // Upsert user with dummy firebase_uid
    let user = await User.findByEmail(email);
    if (!user) {
      user = await User.create({
        firebase_uid: 'dummy_' + Date.now(),
        name, email, phone: null, profile_pic: null,
      });
    }
    req.session.userId = user.id;
    return res.redirect('/');
  } catch (err) {
    console.error('Dummy login error:', err.message);
    return res.redirect('/auth/login?error=' + encodeURIComponent(err.message));
  }
};

// POST /auth/verify — called from client after Firebase Google sign-in
exports.verifyToken = async (req, res) => {
  try {
    const { idToken, phone } = req.body;
    if (!idToken) return res.status(400).json({ error: 'No token provided' });

    const decoded = await verifyFirebaseToken(idToken);

    // Only allow KLE email
    if (!decoded.email?.endsWith('@kletech.ac.in')) {
      return res.status(403).json({ error: 'Only @kletech.ac.in email addresses are allowed.' });
    }

    // Upsert user in DB
    let user = await User.upsert({
      firebase_uid: decoded.uid,
      name:         decoded.name || decoded.email.split('@')[0],
      email:        decoded.email,
      profile_pic:  decoded.picture || null,
    });

    // If phone provided, update it
    if (phone) {
      await User.updatePhone(user.id, phone);
      user.phone = phone;
    }

    // Set session
    req.session.userId = user.id;

    return res.json({
      success: true,
      user:    { id: user.id, name: user.name, email: user.email, role: user.role },
      needsPhone: !user.phone,
    });
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'Authentication failed: ' + err.message });
  }
};

// POST /auth/update-phone
exports.updatePhone = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!req.user) return res.status(401).json({ error: 'Not logged in' });
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
    await User.updatePhone(req.user.id, phone);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /auth/logout
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
};

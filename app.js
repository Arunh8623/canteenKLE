// app.js — KLE Tech Campus Canteen App — Main Entry Point
require('dotenv').config();

const express        = require('express');
const http           = require('http');
const path           = require('path');
const session        = require('express-session');
const cookieParser   = require('cookie-parser');
const morgan         = require('morgan');
const helmet         = require('helmet');

// ── Config / Services ─────────────────────────────────────────
require('./config/firebase');           // init Firebase Admin SDK
const socketConfig   = require('./config/socket');

// ── Middleware ────────────────────────────────────────────────
const { attachUser }  = require('./middleware/firebaseAuth');
const { attachAdmin } = require('./middleware/adminAuth');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// ── Routes ────────────────────────────────────────────────────
const indexRoutes  = require('./routes/index');
const authRoutes   = require('./routes/auth');
const cartRoutes   = require('./routes/cart');
const orderRoutes  = require('./routes/order');
const adminRoutes  = require('./routes/admin');
const aiRoutes     = require('./routes/ai');

// ─────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// Init Socket.io
socketConfig.init(server);

// ── Security ──────────────────────────────────────────────────
// CSP disabled in development — re-enable in production
app.use(helmet({ contentSecurityPolicy: false }));

// ── View Engine ───────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Static Files ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Body Parsers ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Session ───────────────────────────────────────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET || 'fallback_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge:   7 * 24 * 60 * 60 * 1000,   // 7 days
  },
}));

// ── Attach user/admin to every request ───────────────────────
app.use(attachUser);
app.use(attachAdmin);

// ── Global template locals ────────────────────────────────────
// Firebase CLIENT config available to all EJS views
app.locals.firebaseConfig = {
  apiKey:            process.env.FIREBASE_API_KEY             || '',
  authDomain:        process.env.FIREBASE_AUTH_DOMAIN         || '',
  storageBucket:     process.env.FIREBASE_STORAGE_BUCKET      || '',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId:             process.env.FIREBASE_APP_ID              || '',
};

app.use((req, res, next) => {
  res.locals.user           = req.user       || null;
  res.locals.adminStall     = req.adminStall || null;
  res.locals.appName        = 'KLE Canteen';
  res.locals.firebaseConfig = app.locals.firebaseConfig;
  next();
});

// ── Routes ────────────────────────────────────────────────────
app.use('/',       indexRoutes);
app.use('/auth',   authRoutes);
app.use('/cart',   cartRoutes);
app.use('/order',  orderRoutes);
app.use('/admin',  adminRoutes);
app.use('/ai',     aiRoutes);

// ── 404 & Error Handlers ──────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 KLE Canteen App running at http://localhost:${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;

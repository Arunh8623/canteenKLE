// config/firebase.js — Firebase Admin SDK initialization
// Supports two methods:
//   1. serviceAccountKey.json file (recommended — put in project root)
//   2. Individual .env variables (fallback)

const admin = require('firebase-admin');
const path  = require('path');
const fs    = require('fs');

if (!admin.apps.length) {

  const keyFilePath = path.join(__dirname, '..', 'serviceAccountKey.json');

  if (fs.existsSync(keyFilePath)) {
    // ── Method 1: JSON key file (most reliable) ──────────────────
    const serviceAccount = require(keyFilePath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin SDK initialized (serviceAccountKey.json)');

  } else {
    // ── Method 2: .env variables ─────────────────────────────────
    // The private key MUST have real newlines — we replace literal \n
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    if (!privateKey) {
      throw new Error(
        '❌ Firebase credentials missing.\n' +
        'Either place serviceAccountKey.json in the project root,\n' +
        'or set FIREBASE_PRIVATE_KEY in your .env file.'
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        type:                'service_account',
        project_id:          process.env.FIREBASE_PROJECT_ID,
        private_key_id:      process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key:         privateKey,
        client_email:        process.env.FIREBASE_CLIENT_EMAIL,
        client_id:           process.env.FIREBASE_CLIENT_ID,
        auth_uri:            'https://accounts.google.com/o/oauth2/auth',
        token_uri:           'https://oauth2.googleapis.com/token',
      }),
    });
    console.log('✅ Firebase Admin SDK initialized (.env variables)');
  }
}

module.exports = admin;
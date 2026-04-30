require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const admin = require('firebase-admin');

const initAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!process.env.FIREBASE_ADMIN_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !privateKey) {
    throw new Error('Missing Firebase Admin credentials.');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey
    })
  });

  return admin.app();
};

const main = async () => {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/set-admin.js <email>');
    process.exit(1);
  }

  initAdmin();
  const auth = admin.auth();
  const user = await auth.getUserByEmail(email.toLowerCase());
  await auth.setCustomUserClaims(user.uid, { role: 'admin' });
  console.log(`Admin role set for ${email} (${user.uid})`);
};

main().catch((err) => {
  console.error('Failed to set admin role:', err);
  process.exit(1);
});

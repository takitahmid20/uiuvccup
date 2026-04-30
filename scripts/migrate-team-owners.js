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

const generatePassword = (length = 16) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = require('crypto').randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
};

const main = async () => {
  initAdmin();
  const db = admin.firestore();
  const auth = admin.auth();

  const legacyUsers = await db.collection('users').where('role', '==', 'team_owner').get();
  if (legacyUsers.empty) {
    console.log('No legacy team owners found.');
    return;
  }

  for (const doc of legacyUsers.docs) {
    const legacy = doc.data();
    const legacyId = doc.id;
    const email = (legacy.email || '').toLowerCase();
    if (!email) {
      console.log(`Skip legacy user without email: ${legacyId}`);
      continue;
    }

    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (err) {
      if (err.code !== 'auth/user-not-found') {
        throw err;
      }
      const password = legacy.generatedPassword || generatePassword();
      userRecord = await auth.createUser({ email, password });
    }

    await auth.setCustomUserClaims(userRecord.uid, { role: 'team_owner' });

    const teamByEmail = await db.collection('teams').where('email', '==', email).get();
    const teamByOwner = await db.collection('teams').where('ownerId', '==', legacyId).get();
    const teamDoc = !teamByEmail.empty ? teamByEmail.docs[0] : (!teamByOwner.empty ? teamByOwner.docs[0] : null);
    const teamId = teamDoc ? teamDoc.id : null;
    const teamName = teamDoc ? (teamDoc.data().name || legacy.teamName || '') : (legacy.teamName || '');

    await db.collection('users').doc(userRecord.uid).set({
      email,
      role: 'team_owner',
      teamId,
      teamName,
      legacyUserId: legacyId,
      migratedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    if (teamDoc) {
      await db.collection('teams').doc(teamDoc.id).update({
        ownerId: userRecord.uid
      });
    }

    console.log(`Migrated ${email} -> ${userRecord.uid}`);
  }
};

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

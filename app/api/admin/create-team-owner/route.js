import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { adminAuth, adminDb, FieldValue } from '../../../../lib/firebaseAdmin';

const parseAdminEmails = () => {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
};

const isAdminToken = (decoded) => {
  if (decoded?.role === 'admin') {
    return true;
  }
  const allowlist = parseAdminEmails();
  return allowlist.includes((decoded?.email || '').toLowerCase());
};

const generatePassword = (length = 16) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
};

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    if (!isAdminToken(decoded)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const email = (body?.email || '').trim().toLowerCase();
    const teamName = (body?.teamName || '').trim();
    const teamId = body?.teamId || null;

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const password = generatePassword();
    const userRecord = await adminAuth.createUser({ email, password });
    await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'team_owner' });

    await adminDb.collection('users').doc(userRecord.uid).set({
      email,
      role: 'team_owner',
      teamName,
      teamId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({ uid: userRecord.uid, email, password });
  } catch (error) {
    if (error?.code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'Email already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create team owner.' }, { status: 500 });
  }
}

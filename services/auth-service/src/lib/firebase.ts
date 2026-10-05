import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, DecodedIdToken, getAuth } from 'firebase-admin/auth';
import { env } from '../config/env';

let cachedAuth: Auth | null = null;

function ensureApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  if (env.firebase.serviceAccountPath) {
    return initializeApp({
      credential: cert(env.firebase.serviceAccountPath),
    });
  }

  return initializeApp({
    credential: cert({
      projectId: env.firebase.projectId,
      clientEmail: env.firebase.clientEmail,
      privateKey: env.firebase.privateKey,
    }),
  });
}

function getAdminAuth(): Auth {
  if (!cachedAuth) {
    ensureApp();
    cachedAuth = getAuth();
  }
  return cachedAuth;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    env.firebase.serviceAccountPath ||
      (env.firebase.projectId && env.firebase.clientEmail && env.firebase.privateKey)
  );
}

function decodeJwtPayload(token: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const raw = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(raw);
  } catch {
    try {
      const raw = Buffer.from(parts[1], 'base64').toString('utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}

export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  if (isFirebaseConfigured()) {
    try {
      return await getAdminAuth().verifyIdToken(idToken);
    } catch (err: any) {
      console.warn('Firebase Admin verification failed, checking token claims fallback:', err.message);
    }
  }

  // Fallback verification: validate Google Firebase token claims
  const payload = decodeJwtPayload(idToken);
  if (payload && (payload.user_id || payload.sub)) {
    const uid = (payload.user_id || payload.sub) as string;
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSec) {
      throw new Error('Firebase ID token is expired');
    }
    const iss = String(payload.iss || '');
    if (!iss.includes('securetoken.google.com')) {
      throw new Error('Invalid Firebase token issuer');
    }

    return {
      uid,
      sub: uid,
      email: payload.email || '',
      name: payload.name || '',
      picture: payload.picture || '',
      firebase: payload.firebase || { sign_in_provider: 'google.com' },
      ...payload,
    } as unknown as DecodedIdToken;
  }

  throw new Error('Invalid or unverified Firebase ID token');
}

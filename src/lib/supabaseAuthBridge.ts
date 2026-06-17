const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

export interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

let cachedCerts: { keys: Record<string, string>; fetchedAt: number } | null = null;

function base64UrlToUint8Array(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlEncode(input: string | ArrayBuffer): string {
  const bytes =
    typeof input === 'string'
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getFirebaseCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedCerts && now - cachedCerts.fetchedAt < 3_600_000) {
    return cachedCerts.keys;
  }
  const response = await fetch(FIREBASE_CERTS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Firebase certs (${response.status})`);
  }
  const keys = (await response.json()) as Record<string, string>;
  cachedCerts = { keys, fetchedAt: now };
  return keys;
}

async function importFirebasePublicKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

export async function verifyFirebaseIdToken(
  idToken: string,
  projectId: string
): Promise<VerifiedFirebaseUser> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid Firebase ID token format');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(encodedHeader))) as {
    alg?: string;
    kid?: string;
  };

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported Firebase ID token header');
  }

  const certs = await getFirebaseCerts();
  const pem = certs[header.kid];
  if (!pem) {
    throw new Error('Firebase signing key not found');
  }

  const publicKey = await importFirebasePublicKey(pem);
  const signedData = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signature = base64UrlToUint8Array(encodedSignature);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, signature, signedData);
  if (!valid) {
    throw new Error('Invalid Firebase ID token signature');
  }

  const payload = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(encodedPayload))) as {
    sub?: string;
    user_id?: string;
    aud?: string;
    iss?: string;
    exp?: number;
    email?: string;
    name?: string;
    picture?: string;
  };

  const uid = payload.sub || payload.user_id;
  if (!uid) {
    throw new Error('Firebase ID token missing subject');
  }

  const expectedIss = `https://securetoken.google.com/${projectId}`;
  if (payload.aud !== projectId || payload.iss !== expectedIss) {
    throw new Error('Firebase ID token issuer/audience mismatch');
  }

  if (!payload.exp || payload.exp * 1000 < Date.now()) {
    throw new Error('Firebase ID token expired');
  }

  return {
    uid,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}

export async function signSupabaseAccessToken(
  jwtSecret: string,
  supabaseUrl: string,
  firebaseUser: VerifiedFirebaseUser,
  expiresInSeconds = 3600
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    aud: 'authenticated',
    exp: now + expiresInSeconds,
    iat: now,
    iss: `${supabaseUrl.replace(/\/$/, '')}/auth/v1`,
    sub: firebaseUser.uid,
    role: 'authenticated',
    email: firebaseUser.email ?? '',
    firebase_uid: firebaseUser.uid,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(jwtSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

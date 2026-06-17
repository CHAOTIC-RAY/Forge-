const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

/** Public Firebase web API key (also in firebase-applet-config.json). */
const DEFAULT_FIREBASE_API_KEY = 'AIzaSyCI9dw2m47MMk9jIXvl4l7DEPA4AF91tS0';

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

/** Extract SubjectPublicKeyInfo from an X.509 certificate DER blob. */
function extractSpkiFromX509(certDer: ArrayBuffer): ArrayBuffer {
  const bytes = new Uint8Array(certDer);
  let i = 0;

  if (bytes[i++] !== 0x30) throw new Error('Invalid X.509 certificate');
  i += skipAsn1Length(bytes, i);

  if (bytes[i++] !== 0x30) throw new Error('Invalid X.509 TBSCertificate');
  const tbsStart = i - 1;
  const tbsLen = readAsn1Length(bytes, i);
  i += lengthBytes(bytes, i) + tbsLen;

  if (bytes[i++] !== 0x30) throw new Error('Invalid AlgorithmIdentifier');
  i += skipAsn1Length(bytes, i);

  if (bytes[i++] !== 0x03) throw new Error('Invalid BIT STRING');
  i += 1 + lengthBytes(bytes, i);
  const bitStringLen = readAsn1Length(bytes, i);
  i += lengthBytes(bytes, i);
  const keyStart = i + 1;
  const keyLen = bitStringLen - 1;

  const spki = new Uint8Array(keyLen);
  spki.set(bytes.subarray(keyStart, keyStart + keyLen));
  return spki.buffer;
}

function readAsn1Length(bytes: Uint8Array, offset: number): number {
  const first = bytes[offset];
  if ((first & 0x80) === 0) return first;
  const numBytes = first & 0x7f;
  let length = 0;
  for (let j = 1; j <= numBytes; j++) {
    length = (length << 8) | bytes[offset + j];
  }
  return length;
}

function lengthBytes(bytes: Uint8Array, offset: number): number {
  const first = bytes[offset];
  return (first & 0x80) === 0 ? 1 : 1 + (first & 0x7f);
}

function skipAsn1Length(bytes: Uint8Array, offset: number): number {
  const len = readAsn1Length(bytes, offset + 1);
  return lengthBytes(bytes, offset + 1) + len;
}

async function verifyFirebaseIdTokenWithGoogleApi(
  idToken: string,
  apiKey: string
): Promise<VerifiedFirebaseUser> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );

  const payload = (await response.json().catch(() => ({}))) as {
    users?: Array<{
      localId?: string;
      email?: string;
      displayName?: string;
      photoUrl?: string;
    }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || 'Invalid Firebase ID token');
  }

  const user = payload.users?.[0];
  if (!user?.localId) {
    throw new Error('Firebase user not found for this token');
  }

  return {
    uid: user.localId,
    email: user.email,
    name: user.displayName,
    picture: user.photoUrl,
  };
}

async function verifyFirebaseIdTokenWithCerts(
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

  const now = Date.now();
  if (!cachedCerts || now - cachedCerts.fetchedAt >= 3_600_000) {
    const response = await fetch(FIREBASE_CERTS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch Firebase certs (${response.status})`);
    }
    cachedCerts = { keys: (await response.json()) as Record<string, string>, fetchedAt: now };
  }

  const pem = cachedCerts.keys[header.kid];
  if (!pem) {
    throw new Error('Firebase signing key not found');
  }

  const spki = extractSpkiFromX509(pemToArrayBuffer(pem));
  const publicKey = await crypto.subtle.importKey(
    'spki',
    spki,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signedData = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signature = base64UrlToUint8Array(encodedSignature);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, signature, signedData);
  if (!valid) {
    throw new Error('Invalid Firebase ID token signature');
  }

  const tokenPayload = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(encodedPayload))) as {
    sub?: string;
    user_id?: string;
    aud?: string;
    iss?: string;
    exp?: number;
    email?: string;
    name?: string;
    picture?: string;
  };

  const uid = tokenPayload.sub || tokenPayload.user_id;
  if (!uid) {
    throw new Error('Firebase ID token missing subject');
  }

  const expectedIss = `https://securetoken.google.com/${projectId}`;
  if (tokenPayload.aud !== projectId || tokenPayload.iss !== expectedIss) {
    throw new Error('Firebase ID token issuer/audience mismatch');
  }

  if (!tokenPayload.exp || tokenPayload.exp * 1000 < Date.now()) {
    throw new Error('Firebase ID token expired');
  }

  return {
    uid,
    email: tokenPayload.email,
    name: tokenPayload.name,
    picture: tokenPayload.picture,
  };
}

export async function verifyFirebaseIdToken(
  idToken: string,
  projectId: string,
  apiKey = DEFAULT_FIREBASE_API_KEY
): Promise<VerifiedFirebaseUser> {
  try {
    return await verifyFirebaseIdTokenWithGoogleApi(idToken, apiKey);
  } catch (googleError) {
    try {
      return await verifyFirebaseIdTokenWithCerts(idToken, projectId);
    } catch {
      throw googleError instanceof Error ? googleError : new Error('Invalid Firebase ID token');
    }
  }
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

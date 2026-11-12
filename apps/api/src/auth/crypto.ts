import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

export const randomToken = () => randomBytes(32).toString('hex');
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const isToken = (token: unknown): token is string =>
  typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export function privateIdentifier(secret: string, value: string) {
  return createHmac('sha256', Buffer.from(secret, 'hex'))
    .update('ventro-auth-v1:' + value)
    .digest('hex');
}
function encryptionKey(secret: string) {
  return Buffer.from(
    hkdfSync('sha256', Buffer.from(secret, 'hex'), 'ventro-v1', 'email-outbox', 32),
  );
}
export function encryptPayload(secret: string, value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv);
  cipher.setAAD(Buffer.from('ventro-email-v1'));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}
export function decryptPayload(secret: string, value: string): unknown {
  const [version, iv, tag, encrypted, extra] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !encrypted || extra)
    throw new Error('Invalid encrypted email');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(secret),
    Buffer.from(iv, 'base64url'),
  );
  decipher.setAAD(Buffer.from('ventro-email-v1'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64url')),
      decipher.final(),
    ]).toString('utf8'),
  ) as unknown;
}

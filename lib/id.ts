import { randomBytes } from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars

function randomAlpha(len: number): string {
  const bytes = randomBytes(len);
  return Array.from(bytes)
    .map(b => ALPHABET[b % ALPHABET.length]!)
    .join('');
}

/** Generates a collision-resistant human-readable order reference. e.g. PL-20240601-A3F2X8KY */
export function generateOrderReference(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = randomAlpha(8);
  return `PL-${date}-${rand}`;
}

/** Generates a cryptographically secure raw download token (hex string, 32 bytes). */
export function generateDownloadToken(): string {
  return randomBytes(32).toString('hex');
}

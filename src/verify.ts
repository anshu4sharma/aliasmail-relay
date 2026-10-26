import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifies the HMAC-SHA256 signature of an incoming webhook payload.
 *
 * @param payload Raw string or Buffer of the HTTP request body
 * @param signature Header signature received (e.g., 'sha256=...' or hex string)
 * @param secret The shared HMAC secret
 * @returns boolean indicating whether the signature is authentic
 */
export function verifySignature(
  payload: string | Buffer,
  signature: string | undefined,
  secret: string | undefined
): boolean {
  if (!secret) {
    // If no secret configured, signature verification is bypassed with warning
    return true;
  }

  if (!signature) {
    return false;
  }

  // Normalize signature format (remove 'sha256=' prefix if present)
  const cleanSignature = signature.startsWith('sha256=')
    ? signature.slice(7)
    : signature;

  try {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const actualBuffer = Buffer.from(cleanSignature, 'hex');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
}

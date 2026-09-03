/**
 * SAFE - `jose` implements JWS/JWE, a format node:crypto does not provide. A
 * third-party crypto-adjacent package whose job the platform genuinely does not
 * do is not what CWE-1104 is about.
 */
import { SignJWT } from 'jose';

export async function issueToken(sub: string, key: CryptoKey): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'RS256' })
    .setExpirationTime('15m')
    .sign(key);
}

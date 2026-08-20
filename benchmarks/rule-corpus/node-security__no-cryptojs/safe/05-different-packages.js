/**
 * SAFE - two maintained packages whose names sit next to crypto-js
 * alphabetically. Neither is the deprecated library.
 */
import cryptoRandomString from 'crypto-random-string';
import { sha256 } from 'crypto-hash';

export const nonce = () => cryptoRandomString({ length: 24, type: 'url-safe' });
export const digest = (value) => sha256(value);

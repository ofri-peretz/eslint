/**
 * SAFE for THIS rule - crypto-js is imported, but only its SHA256 is used. The
 * weak generator is never reached, so no-cryptojs-weak-random has nothing to
 * say; no-cryptojs is the rule that owns the dependency itself.
 */
import CryptoJS from 'crypto-js';

export const checksum = (value) => CryptoJS.SHA256(value).toString(CryptoJS.enc.Hex);

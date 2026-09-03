/**
 * ADVERSARIAL SAFE - a promisified KDF that is NOT pbkdf2. The promisify branch
 * has to look at what was wrapped; `64` here is a key length.
 */
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(crypto.scrypt);

export const derive = (password, salt) => scryptAsync(password, salt, 64);

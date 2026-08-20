/**
 * VULNERABLE - the `lib` namespace imported on its own. Same generator, one
 * member access shorter (CWE-338).
 */
import { lib, enc } from 'crypto-js';

export const passwordResetToken = () => lib.WordArray.random(24).toString(enc.Base64);

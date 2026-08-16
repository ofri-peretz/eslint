/**
 * ADVERSARIAL VULNERABLE - the generator reached through the package's own
 * subpath entry. `crypto-js/core` is the same package (CWE-338).
 */
import { lib } from 'crypto-js/core';

export const inviteCode = () => lib.WordArray.random(9).toString();

/**
 * VULNERABLE - the last hop written as a computed member, which is what a
 * config-driven wrapper produces after inlining. Same generator (CWE-338).
 */
import CryptoJS from 'crypto-js';

const METHOD = 'random';

export const coupon = () => CryptoJS.lib.WordArray[METHOD](8).toString();

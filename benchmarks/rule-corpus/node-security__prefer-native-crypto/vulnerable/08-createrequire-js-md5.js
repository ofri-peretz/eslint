/**
 * VULNERABLE - a CommonJS-only hash library reached from an ESM CLI through
 * createRequire. The callee is not spelled `require`, but js-md5 is loaded
 * (CWE-1104).
 */
import { createRequire } from 'node:module';

const load = createRequire(import.meta.url);
const md5 = load('js-md5');

export const etagFor = (body) => `"${md5(body)}"`;

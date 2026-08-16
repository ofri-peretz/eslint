/**
 * VULNERABLE - the namespace spelling of the same escape hatch:
 * `module.createRequire(...)` rather than a destructured import. Same load, same
 * unmaintained dependency (CWE-1104).
 */
import nodeModule from 'node:module';

const requireCjs = nodeModule.createRequire(import.meta.url);
const { AES } = requireCjs('crypto-js');

export const encryptBackup = (plain, key) => AES.encrypt(plain, key).toString();

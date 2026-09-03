/**
 * ADVERSARIAL SAFE - the re-export path the fix just opened, pointed at a local
 * module. `export * from './crypto/native.js'` names no package.
 */
export * from './crypto/native.js';
export { seal, open } from './crypto/envelope.js';

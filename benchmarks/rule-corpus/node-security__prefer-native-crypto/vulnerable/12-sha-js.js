/**
 * VULNERABLE - `sha.js`, the browserify-era pure-JS SHA family, imported in a
 * Node build script that already has node:crypto available (CWE-1104).
 */
import shajs from 'sha.js';

export const assetHash = (buffer) => shajs('sha256').update(buffer).digest('hex');

/**
 * SAFE - a local object named `forge`. No module specifier appears in this file
 * at all; the name is the only thing that resembles the library.
 */
import { createSign } from 'node:crypto';

const forge = {
  sign: (data, key) => createSign('sha256').update(data).end().sign(key, 'base64'),
};

export const signManifest = (data, key) => forge.sign(data, key);

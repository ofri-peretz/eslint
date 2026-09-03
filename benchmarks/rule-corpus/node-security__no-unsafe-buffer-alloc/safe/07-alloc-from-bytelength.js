/**
 * SAFE - the size comes from `Buffer.byteLength` of a value already in memory,
 * not from a number the peer chose. Allocating exactly what you already hold
 * cannot be inflated.
 */
import { Buffer } from 'node:buffer';

export function encodeRecord(record) {
  const json = JSON.stringify(record);
  const body = Buffer.alloc(Buffer.byteLength(json, 'utf8'));
  body.write(json, 0, 'utf8');
  return body;
}

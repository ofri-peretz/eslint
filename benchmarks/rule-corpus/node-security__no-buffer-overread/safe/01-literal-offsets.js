/**
 * SAFE - a fixed-layout header read at LITERAL offsets, after the one check
 * that matters: the buffer is long enough to contain the header at all.
 */
import { Buffer } from 'node:buffer';

const HEADER_BYTES = 12;

export function parseHeader(frame) {
  if (frame.length < HEADER_BYTES) {
    throw new RangeError('short frame');
  }
  return {
    magic: frame.readUInt32BE(0),
    version: frame.readUInt16BE(4),
    length: frame.readUInt32BE(8),
  };
}

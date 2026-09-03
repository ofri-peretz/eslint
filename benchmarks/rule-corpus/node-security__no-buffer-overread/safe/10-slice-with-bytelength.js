/**
 * SAFE - the slice bounds come from `Buffer.byteLength` of a value the process
 * itself produced. A length measured off data already in memory cannot point
 * past the buffer that was sized from it.
 */
import { Buffer } from 'node:buffer';

export function splitEnvelope(envelope, headerText) {
  const headerBytes = Buffer.byteLength(headerText, 'utf8');
  return {
    header: envelope.subarray(0, headerBytes),
    body: envelope.subarray(headerBytes),
  };
}

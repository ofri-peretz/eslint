/**
 * SAFE (adversarial) - A content-addressed asset cache. `hashAssetName` contains
 * the word "hash" because it hashes a FILENAME; `value` is a file extension.
 * There is no credential anywhere in this module, and nothing an attacker could
 * learn from how long the comparison takes.
 */
import { createHash } from 'node:crypto';

export function hashAssetName(fileName: string, contents: Buffer): string {
  const value = fileName.split('.').pop() ?? '';
  const digestLength = value === 'css' ? 8 : 16;
  return createHash('sha1').update(contents).digest('hex').slice(0, digestLength) + '.' + value;
}

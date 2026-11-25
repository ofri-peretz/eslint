// CWE-330: Use of Insufficiently Random Values — rejection sampling removes the bias
// @author       claude
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
// Safe — the pkce-challenge shape: bytes at or above the largest multiple of
// the alphabet size are dropped before % is taken, so every character is
// equally likely.
const mask =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';

export function randomToken(size) {
  const cutoff = 256 - (256 % mask.length);
  let result = '';
  while (result.length < size) {
    const bytes = crypto.getRandomValues(new Uint8Array(size - result.length));
    for (const b of bytes) {
      if (b < cutoff) result += mask[b % mask.length];
    }
  }
  return result;
}

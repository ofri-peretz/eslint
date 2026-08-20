/**
 * SAFE - A module-PRIVATE helper. Every call site is in this file and every one
 * passes a literal, so the value is knowable here. Reporting a parameter whose
 * callers you can read is a guess, not evidence.
 */
function segmentUrl(segment) {
  return `https://cdn.example.com/assets/${segment}/manifest.json`;
}

export const MANIFESTS = [segmentUrl('icons'), segmentUrl('fonts')];

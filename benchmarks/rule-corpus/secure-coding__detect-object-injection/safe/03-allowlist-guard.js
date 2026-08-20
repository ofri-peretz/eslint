/**
 * SAFE — the key is checked against a closed allowlist before it indexes.
 *
 * The set of properties this can ever write is the three strings on line 12.
 * `__proto__` is not one of them, so the write is bounded no matter what the
 * request contains. This is the documented fix; reporting it costs the plugin
 * its credibility with exactly the developers who did the right thing.
 */
const EDITABLE_FIELDS = ['displayName', 'timezone', 'locale'];

export function applyProfilePatch(profile, field, value) {
  if (EDITABLE_FIELDS.includes(field)) {
    profile[field] = value;
  }
  return profile;
}

/**
 * SAFE - A semver core matcher. Three optional groups and four quantifiers,
 * every one of them separated by a mandatory literal that belongs to none of
 * the neighbouring character classes. There is a single parse for any input.
 */
const SEMVER_CORE = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.]+)?(?:\+[0-9A-Za-z.]+)?$/;

export function isExactVersion(spec) {
  return SEMVER_CORE.test(spec);
}

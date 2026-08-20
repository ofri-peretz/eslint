/**
 * SAFE - A substring test over prose. Nothing here is a URL, so nothing here is
 * a security decision about a host.
 */
export function mentionsMigration(changelog) {
  return changelog.includes('example.com');
}

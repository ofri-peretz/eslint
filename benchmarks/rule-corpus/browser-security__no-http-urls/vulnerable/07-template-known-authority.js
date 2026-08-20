/**
 * VULNERABLE - A template whose AUTHORITY is written down; only the path is
 * dynamic. The host is knowable, so there is something to judge.
 */
export function reportUrl(id) {
  return `http://reports.acme-corp.io/v0/${id}`;
}

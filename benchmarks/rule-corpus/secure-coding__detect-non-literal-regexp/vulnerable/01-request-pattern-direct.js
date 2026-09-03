/** VULNERABLE - CWE-400 + bypass. The caller supplies the PATTERN, so they can
 * send `(a+)+$` (measured: 39,812 ms on 30 chars) or `.*` to make an allow
 * decision match everything (measured: true). */
export function search(req, rows) {
  const re = new RegExp(req.query.q);
  return rows.filter((r) => re.test(r.name));
}

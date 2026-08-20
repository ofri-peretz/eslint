/** VULNERABLE - anchoring does not constrain the pattern BODY. */
export function search(req, rows) {
  return rows.filter((r) => new RegExp(`^${req.query.q}$`).test(r.name));
}

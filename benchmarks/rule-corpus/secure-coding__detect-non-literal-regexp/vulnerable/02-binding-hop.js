/** VULNERABLE - one const between the source and the constructor. */
export function search(req, rows) {
  const pattern = req.query.q;
  return rows.filter((r) => new RegExp(pattern).test(r.name));
}

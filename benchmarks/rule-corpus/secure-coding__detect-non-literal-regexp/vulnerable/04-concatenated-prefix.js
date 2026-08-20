/** VULNERABLE - a fixed prefix plus attacker text is still attacker-controlled. */
export function search(req, rows) {
  return rows.filter((r) => new RegExp('^' + req.query.q).test(r.name));
}

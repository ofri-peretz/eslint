/**
 * SAFE - the remediation for vulnerable/13.
 *
 * An explicit allowlist of assignable fields. This is the edit that clears the
 * finding, and a rule that still reported here would be unsatisfiable — which is
 * how a rule gets disabled, costing every other finding it makes.
 */
const ASSIGNABLE = ['displayName', 'email', 'theme'];

export function updateProfile(req, user) {
  for (const key of Object.keys(req.body)) {
    if (ASSIGNABLE.includes(key)) {
      user[key] = req.body[key];
    }
  }
  return user;
}

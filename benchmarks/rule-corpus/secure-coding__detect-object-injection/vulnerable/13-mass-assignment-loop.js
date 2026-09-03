/**
 * VULNERABLE - CWE-915 mass assignment.
 *
 * Every key the caller sends is copied onto the record, so they choose which
 * field is written. Verified: posting {"isAdmin":true} sets it. No prototype is
 * touched — a different weakness from 11/12, with a different fix (an allowlist
 * of assignable fields, not a guarded traversal).
 */
export function updateProfile(req, user) {
  for (const key of Object.keys(req.body)) {
    user[key] = req.body[key];
  }
  return user;
}

/**
 * VULNERABLE (adversarial) - The same `typeof … === 'object'` hole, one property
 * deeper. `req.body.profile` is a MemberExpression whose OBJECT is itself a
 * MemberExpression rather than a bare identifier - a shape difference with no
 * security meaning whatsoever.
 */
import { profiles } from '../store/profiles';

export function updateProfile(req, res) {
  if (typeof req.body.profile === 'object') {
    Object.assign(profiles[req.session.userId], req.body.profile);
    return res.json(profiles[req.session.userId]);
  }
  return res.status(400).json({ error: 'expected an object' });
}

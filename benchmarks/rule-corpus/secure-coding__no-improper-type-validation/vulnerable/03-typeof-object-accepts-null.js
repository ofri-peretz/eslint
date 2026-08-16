/**
 * VULNERABLE - `typeof null === 'object'`, so this guard admits `null` and the
 * merge below throws on a request the author believed was already validated.
 * It also admits an ARRAY, which turns the profile merge into an index write.
 * This is the shape the rule's own `unsafeTypeofCheck` message describes.
 */
import { profiles } from '../store/profiles';

export function updateProfile(req, res) {
  if (typeof req.body === 'object') {
    Object.assign(profiles[req.session.userId], req.body);
    return res.json(profiles[req.session.userId]);
  }
  return res.status(400).json({ error: 'expected an object' });
}

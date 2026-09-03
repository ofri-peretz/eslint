/**
 * VULNERABLE (adversarial, false-negative direction) - Fixture 03's bug with the
 * identifiers renamed: no `req`, `body`, `data`, `input`, `query` or `params`
 * anywhere. `typeof envelope === 'object'` still admits `null` and still admits
 * an array, and the merge still runs. Only the spelling changed.
 */
import { profiles } from '../store/profiles';

export function applyPatch(envelope, actorId, reply) {
  if (typeof envelope === 'object') {
    Object.assign(profiles[actorId], envelope);
    return reply.json(profiles[actorId]);
  }
  return reply.status(400).json({ error: 'expected an object' });
}

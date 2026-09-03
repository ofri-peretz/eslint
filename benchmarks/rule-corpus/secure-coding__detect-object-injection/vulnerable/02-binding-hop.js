/**
 * One binding hop — the key is copied into a `const` before it indexes anything.
 *
 * `const` describes the BINDING, not the value's provenance. The initialiser is
 * a request field, so the set of strings this can hold is chosen by whoever sent
 * the request.
 */
import { profileRepository } from '../repositories/profile-repository.js';

export async function updateProfileField(req, res) {
  const field = req.query.field;
  const profile = await profileRepository.byId(req.session.userId);

  profile[field] = req.body.value;
  await profileRepository.save(profile);

  res.json({ profile });
}

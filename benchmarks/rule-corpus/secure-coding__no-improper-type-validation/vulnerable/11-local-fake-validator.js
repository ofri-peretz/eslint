/**
 * VULNERABLE (adversarial) - A LOCAL function wearing a trusted name.
 * `validateType` is on the rule's own default list of "proper validation
 * functions", and its body returns `true` unconditionally. The name is not the
 * evidence.
 */
import { settings } from '../store/settings';

function validateType(candidate) {
  return true;
}

export function patchSettings(req, res) {
  if (validateType(req.body)) {
    Object.assign(settings, req.body);
    return res.status(204).end();
  }
  return res.status(400).json({ error: 'bad payload' });
}

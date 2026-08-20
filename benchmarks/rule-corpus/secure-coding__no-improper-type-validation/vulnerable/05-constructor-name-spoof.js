/**
 * VULNERABLE - `constructor.name` is an ordinary readable property, so a JSON
 * body of `{"constructor":{"name":"Object"}}` satisfies this check and reaches
 * the settings merge. The rule's `unreliableConstructorCheck` message names this
 * exact shape.
 */
import { settings } from '../store/settings';

export function patchSettings(req, res) {
  const incoming = req.body;
  if (incoming.constructor.name === 'Object') {
    Object.assign(settings, incoming);
    return res.status(204).end();
  }
  return res.status(400).json({ error: 'expected a plain object' });
}

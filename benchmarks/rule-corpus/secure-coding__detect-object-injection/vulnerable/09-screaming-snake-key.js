/**
 * ADVERSARIAL — the key is attacker-controlled and its name is SCREAMING_SNAKE.
 *
 * The rule treats any `/^[A-Z][A-Z0-9_]{2,}$/` identifier as a module-level
 * constant, on the reasoning that such names are "compile-time string/symbol
 * values defined in the codebase, never derived from user input". That is a
 * claim about a convention, not about this binding — and here the binding's
 * initialiser is sitting three lines above, reading the request.
 *
 * A feature-flag override endpoint is exactly where SCREAMING_SNAKE keys and
 * user input meet.
 */
import { featureFlags } from '../lib/feature-flags.js';

export function overrideFlag(req, res) {
  const FLAG_NAME = req.body.flag;
  const overrides = featureFlags.overridesFor(req.tenantId);

  overrides[FLAG_NAME] = req.body.enabled === true;
  res.json({ overrides });
}

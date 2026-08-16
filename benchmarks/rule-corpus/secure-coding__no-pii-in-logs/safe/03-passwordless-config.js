/**
 * SAFE - Boot diagnostics for an auth service that has NO passwords at all.
 * `passwordlessEnabled` is a feature flag; `passportStrategies` is a count of
 * configured Passport.js strategies. Logging either leaks nothing.
 *
 * `password` is a substring of `passwordless`, which is the opposite meaning.
 */
import { authConfig } from '../config/auth.js';

export function logAuthMode() {
  console.log('auth mode', authConfig.passwordlessEnabled);
  console.log('strategies', authConfig.passportStrategyCount);
}

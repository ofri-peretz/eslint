/**
 * SAFE — no password anywhere in this file.
 *
 * This is the exact snippet the repo's CLAUDE.md uses to open its "a rule
 * decides by evidence, never by a name" section: `passengers` contains `pass`,
 * so a substring test reports "Password length requirement is too weak" on a
 * booking engine. A maintainer who receives that finding does not file a bug —
 * they uninstall the plugin, and the ecosystem's recall for that codebase drops
 * to zero for every rule in it.
 */
import { fareEngine } from '../lib/fare-engine.js';

export function quote(passengers, route) {
  if (passengers.length >= 4) {
    return fareEngine.groupFare(passengers, route);
  }

  return fareEngine.individualFares(passengers, route);
}

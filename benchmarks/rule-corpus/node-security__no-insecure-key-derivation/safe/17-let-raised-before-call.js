/**
 * ADVERSARIAL SAFE - a `let` whose value is raised before the call. Reading the
 * declarator alone would answer 1,000; the value that reaches the sink is
 * 600,000. Abstaining is the only answer this rule can defend.
 */
import { pbkdf2Sync } from 'node:crypto';

export function derive(password, salt, { hardened }) {
  let rounds = 1000;
  if (hardened) rounds = 1200000;
  else rounds = 600000;
  return pbkdf2Sync(password, salt, rounds, 64, 'sha512');
}

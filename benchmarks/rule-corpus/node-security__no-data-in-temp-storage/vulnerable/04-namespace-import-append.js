/**
 * VULNERABLE - an audit trail appended to the shared temp directory. Append is
 * the same data-at-rest exposure as a write; the file is world-readable and its
 * name is fixed, so a local attacker can symlink it at something they want
 * clobbered before the first append creates it.
 */
import * as fs from 'node:fs';

export function auditLogin(userId, ip) {
  fs.appendFileSync('/tmp/auth-audit.log', `${new Date().toISOString()} ${userId} ${ip}\n`);
}

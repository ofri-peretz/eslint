/**
 * VULNERABLE (adversarial, false-negative direction) - A real credential leak
 * where NOTHING is spelled like a credential. `pw` is the column, `row` is the
 * record, `hint` is the reset hint. This is the test nobody runs, and it is the
 * honest measure of a rule that decides from names.
 */
import { logger } from '../lib/logger.js';
import { db } from '../lib/db.js';

export async function resolveAccount(accountId) {
  const row = await db.oneOrNone('select pw, hint from accounts where id = $1', [accountId]);
  logger.info('account resolved', row.pw, row.hint);
  return row;
}

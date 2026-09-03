/**
 * SAFE (adversarial) - Identifiers that merely START with a transaction
 * keyword. `BEGINNING_BALANCE` is a column, not a BEGIN.
 */
import { Pool } from 'pg';

const pool = new Pool();

export function balances() {
  return pool.query('SELECT beginning_balance, committed_total FROM ledger');
}

export function ends() {
  return pool.query('SELECT * FROM sprints WHERE ended_at IS NULL');
}

/**
 * VULNERABLE (pg driver in file) - Handle passed in as a parameter - provenance outside the file entirely.
 */
import { Pool } from 'pg';
const db = new Pool();
export async function listOrders(db, req) {
  return db.query(`SELECT * FROM orders WHERE customer = '${req.params.id}'`);
}

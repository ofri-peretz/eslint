/**
 * SAFE (wave 2) - A loop binding whose only source is a literal array written in this file.
 */
import { db } from '../lib/db';

const COLUMNS = ['id', 'name', 'email'];

export async function profile() {
  for (const column of COLUMNS) {
    await db.query('SELECT ' + column + ' FROM users WHERE active = true');
  }
}

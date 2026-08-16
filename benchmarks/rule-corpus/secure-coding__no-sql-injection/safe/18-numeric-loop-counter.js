/**
 * SAFE (wave 3) - A loop counter is written by the loop, not by a caller.
 */
import { db } from '../lib/db';

export async function pages(count) {
  for (let page = 0; page < count; page++) {
    await db.query('SELECT * FROM users LIMIT 10 OFFSET ' + page * 10);
  }
}

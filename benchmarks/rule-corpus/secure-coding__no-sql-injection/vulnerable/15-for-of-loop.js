/**
 * VULNERABLE (wave 2) - The loop binding takes its value from the request.
 */
import { db } from '../lib/db';

export async function purge(req) {
  for (const tag of req.query.tags) {
    await db.execute("DELETE FROM logs WHERE tag = '" + tag + "'");
  }
}

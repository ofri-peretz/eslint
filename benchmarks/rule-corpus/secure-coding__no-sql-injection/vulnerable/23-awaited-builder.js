/**
 * VULNERABLE (wave 3) - The builder is awaited before it reaches the sink.
 */
import { db } from '../lib/db';

const build = async (tag) => `SELECT * FROM logs WHERE tag = '${tag}'`;

export async function logs(req) {
  return db.query(await build(req.query.tag));
}

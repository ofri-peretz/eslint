// The path hops through one binding and the statement through another before
// either reaches the sink.
import type { Request, Response } from 'express';
import { Pool } from 'pg';

const pool = new Pool();

export async function restore(req: Request, res: Response): Promise<void> {
  const dumpPath = req.query.file as string;
  const sql = `COPY inventory FROM '${dumpPath}' CSV HEADER`;
  await pool.query(sql);
  res.sendStatus(204);
}

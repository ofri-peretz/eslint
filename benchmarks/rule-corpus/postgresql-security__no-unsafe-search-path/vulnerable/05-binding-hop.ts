// The schema reaches the sink through one binding hop, and the statement
// itself is assembled into a second binding before it is executed.
import type { Request, Response } from 'express';
import { Pool } from 'pg';

const pool = new Pool();

export async function switchSchema(req: Request, res: Response): Promise<void> {
  const schema = req.query.schema as string;
  const sql = `SET search_path TO ${schema}`;
  await pool.query(sql);
  res.sendStatus(204);
}

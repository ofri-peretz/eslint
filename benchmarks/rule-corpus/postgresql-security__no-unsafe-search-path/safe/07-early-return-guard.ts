// Adversarial: the allowlist check aborts with an HTTP response and a bare
// return rather than a throw. It is the same guard.
import type { Request, Response } from 'express';
import { Pool } from 'pg';

const pool = new Pool();
const ALLOWED_SCHEMAS = ['reporting', 'billing', 'support'];

export async function scope(req: Request, res: Response): Promise<void> {
  const schema = req.query.schema as string;
  if (!ALLOWED_SCHEMAS.includes(schema)) {
    res.status(400).json({ error: 'unknown schema' });
    return;
  }
  await pool.query(`SET search_path TO ${schema}`);
  res.sendStatus(204);
}

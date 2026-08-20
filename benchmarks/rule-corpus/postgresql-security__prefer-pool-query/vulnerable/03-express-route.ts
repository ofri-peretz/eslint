/**
 * VULNERABLE (CWE-400) - A typed `PoolClient` checked out per request for one
 * read. Under load this is the shape that pins every pool slot to a request
 * that is only waiting on one statement.
 */
import express from 'express';
import { Pool, type PoolClient } from 'pg';

const pool = new Pool();
export const router = express.Router();

router.get('/products/:sku', async (req, res) => {
  const client: PoolClient = await pool.connect();
  try {
    const result = await client.query('SELECT sku, price_cents FROM products WHERE sku = $1', [
      req.params.sku,
    ]);
    res.json(result.rows[0] ?? null);
  } finally {
    client.release();
  }
});

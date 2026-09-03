/**
 * SAFE - An Express handler runs once per request, and it issues one query. A
 * function body is not a loop.
 */
import express from 'express';
import { Pool } from 'pg';

const pool = new Pool();
const router = express.Router();

router.get('/users/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, email FROM users WHERE id = $1', [req.params.id]);
    res.json(rows[0] ?? null);
  } catch (error) {
    next(error);
  }
});

export default router;

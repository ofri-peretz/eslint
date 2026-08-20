/**
 * VULNERABLE - `await import()` on a value read straight off an HTTP request.
 * A remote caller picks which module the server evaluates; module evaluation
 * is arbitrary code execution.
 */
import express from 'express';

const app = express();

app.get('/render/:format', async (req, res, next) => {
  try {
    const renderer = await import(req.query.plugin);
    res.type('text/plain').send(renderer.default(req.params.format));
  } catch (err) {
    next(err);
  }
});

export default app;

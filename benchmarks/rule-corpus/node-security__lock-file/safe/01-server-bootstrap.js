/**
 * SAFE - and safe for a reason that has nothing to do with this file.
 *
 * `lock-file` reads NO part of the AST. Its only visitor is `Program`, used
 * purely as a node to attach the report to; the verdict comes from
 * `fs.existsSync` walking up from `path.dirname(context.filename)`. This file
 * is quiet because the project it is linted in commits a lock file, and it
 * would be quiet with any contents whatsoever - `MEASUREMENT-PROBE.mts` case 3
 * shows an EMPTY file getting the same verdict as this one.
 */
import express from 'express';
import helmet from 'helmet';

const app = express();

app.use(helmet());
app.get('/healthz', (_req, res) => res.json({ ok: true }));

export default app;

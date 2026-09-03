/**
 * VULNERABLE - A path-mounted sub-router carrying the internal admin surface,
 * mounted with no authentication guard in front of it. Everything under
 * /api/internal is public.
 */
import express from 'express';

import internalRouter from './internal-router.js';

export const app = express();

app.use('/api/internal', internalRouter);

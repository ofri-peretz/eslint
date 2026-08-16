/**
 * SAFE - Routes that are public by definition. You cannot be authenticated
 * before you authenticate, and a liveness probe is called by the orchestrator,
 * which holds no session.
 */
import express from 'express';

import { login, requestPasswordReset } from '../services/auth.js';

export const app = express();

app.post('/login', login);
app.post('/forgot-password', requestPasswordReset);
app.get('/healthz', (req, res) => res.json({ ok: true }));

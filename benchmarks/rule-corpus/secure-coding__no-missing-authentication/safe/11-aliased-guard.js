/**
 * SAFE (adversarial wave) - The guard reaches the route through a const alias,
 * so the argument at the registration site is a bare identifier called `guard`
 * with no authentication word in it. The binding resolves to `requireAuth()`
 * one line above.
 */
import express from 'express';

import { requireAuth } from '../middleware/require-auth.js';
import { getProfile } from '../services/users.js';

export const app = express();

const guard = requireAuth({ audience: 'api' });

app.use('/api', guard);
app.get('/api/me', guard, getProfile);

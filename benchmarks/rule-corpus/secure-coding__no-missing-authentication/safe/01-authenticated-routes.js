/**
 * SAFE - The CORRECT remediation for fixture 01: every sensitive route carries
 * an authentication middleware argument, and the admin route additionally
 * carries an authorisation guard.
 */
import express from 'express';

import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/require-role.js';
import { getProfile, listUsers } from '../services/users.js';

export const app = express();

app.get('/api/me', authenticate, getProfile);
app.get('/admin/users', authenticate, requireRole('admin'), listUsers);

/**
 * VULNERABLE - A conference app route that lists the private attendee roster
 * for a talk. No authentication. The handler is named `renderSessionRoster`
 * because the domain noun for a conference talk is "session".
 *
 * `session` is one of the recognised authentication middleware patterns, so the
 * word appears in this call's source text without any session ever being
 * checked.
 */
import { Router } from 'express';

import { renderSessionRoster } from '../views/roster.js';

const router = Router();

router.get('/api/talks/:id/roster', renderSessionRoster);

export default router;

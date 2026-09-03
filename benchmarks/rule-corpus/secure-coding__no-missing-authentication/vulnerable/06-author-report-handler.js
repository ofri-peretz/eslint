/**
 * VULNERABLE - A CMS analytics route exposing per-author revenue. Unauthenticated,
 * exactly like fixture 02; the only difference is that the handler is named
 * `getAuthorReport`, because the domain noun is "author".
 *
 * `auth` is a substring of `author`. If this file scores differently from 02,
 * the rule is accepting the spelling of a handler as proof of authentication.
 */
import { Router } from 'express';

import { getAuthorReport } from '../services/reports.js';

const router = Router();

router.get('/api/reports/authors/:id', getAuthorReport);

export default router;

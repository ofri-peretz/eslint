/**
 * VULNERABLE - A session cookie set with httpOnly off and SameSite=None. The
 * first makes it readable by any injected script; the second makes it ride
 * cross-site requests. Both are insecure initialisations of a security-relevant
 * default (CWE-1188), and neither is `secure: false`.
 */
import express from 'express';

export const router = express.Router();

router.post('/login', (req, res) => {
  res.cookie('sid', req.session.id, {
    secure: true,
    httpOnly: false,
    sameSite: 'none',
  });
  res.status(204).end();
});

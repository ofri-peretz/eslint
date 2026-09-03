/**
 * VULNERABLE - The email regex that circulates on Stack Overflow and ships in
 * hundreds of sign-up forms. `(([a-zA-Z0-9\-])+\.)+` is a quantified group
 * whose body is itself quantified over an overlapping character set, so
 * "a@aaaaaaaaaaaaaaaaaaaaaaaaaaaa!" backtracks exponentially before failing.
 */
import express from 'express';

const router = express.Router();
const EMAIL_RE = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;

router.post('/signup', (req, res) => {
  if (!EMAIL_RE.test(req.body.email)) {
    return res.status(400).json({ error: 'invalid email' });
  }
  return res.status(201).end();
});

export default router;

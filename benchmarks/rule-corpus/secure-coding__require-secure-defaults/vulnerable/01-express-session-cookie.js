/**
 * VULNERABLE - The session cookie is served without the Secure attribute, so it
 * rides plaintext HTTP and can be lifted off the wire. express-session's own
 * docs call this out; the value is hardcoded rather than tied to the
 * environment, so it ships to production as written.
 */
import express from 'express';
import session from 'express-session';

export const app = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 86_400_000 },
  }),
);

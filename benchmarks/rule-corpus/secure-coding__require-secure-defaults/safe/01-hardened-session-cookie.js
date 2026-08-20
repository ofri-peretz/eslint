/**
 * SAFE - The correct remediation for vulnerable/01: Secure, HttpOnly and
 * SameSite=strict, with the proxy trusted so the Secure flag survives TLS
 * termination.
 */
import express from 'express';
import session from 'express-session';

export const app = express();

app.set('trust proxy', 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true, httpOnly: true, sameSite: 'strict', maxAge: 86_400_000 },
  }),
);

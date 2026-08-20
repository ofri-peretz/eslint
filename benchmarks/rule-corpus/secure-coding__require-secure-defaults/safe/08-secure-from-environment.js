/**
 * SAFE - ADVERSARIAL. The recommended shape: the Secure attribute follows the
 * environment through a shorthand property, so it is on in production and off
 * on a local http listener. The literal `false` never appears.
 */
import session from 'express-session';

const secure = process.env.NODE_ENV === 'production';

export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure, httpOnly: true, sameSite: 'lax' },
});

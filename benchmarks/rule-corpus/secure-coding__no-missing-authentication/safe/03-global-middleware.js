/**
 * SAFE - Global middleware registration. `app.use(x)` with no path mounts a
 * cross-cutting concern; it addresses no route, so "this route is missing
 * authentication" is not a statement that can be made about it.
 */
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

export const app = express();

app.use(helmet());
app.use(cors({ origin: 'https://app.example.com' }));
app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

// Provenance: shardeum/json-rpc-server src/routes/healthCheck.ts:8 (HEAD 2026-08-22).
//
// Benign because: liveness and readiness probes are REQUIRED to be reachable
// without credentials — Kubernetes, load balancers, and uptime monitors all call
// them unauthenticated. Reporting these as "missing authentication" (CVSS 9.8) or
// as "exposed debug endpoints" inverts the actual requirement.
//
// The app is otherwise hardened (helmet, rate limiting, auth on real routes) so that
// any finding here is about the PROBE ENDPOINTS specifically and nothing else.
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('./auth');

const app = express();
app.use(helmet());
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

// Real routes are authenticated.
app.get('/api/accounts', authenticate(), (req, res) => res.json([]));

// Probe endpoints are deliberately open. This is the requirement, not an oversight.
app.get('/is-alive', (req, res) => res.send('ok'));
app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok' }));
app.get('/readyz', (req, res) => res.status(200).json({ ready: true }));

module.exports = app;

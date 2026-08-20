/**
 * SAFE - head-based trace sampling.
 *
 * One request in a hundred is exported to the tracing backend. The decision is
 * a cost control, not a security boundary; a predictable sampling decision
 * leaks nothing an attacker cannot measure by watching latency.
 */
'use strict';

const SAMPLE_RATE = 0.01;

function shouldSample() {
  return Math.random() < SAMPLE_RATE;
}

function traceMiddleware(req, res, next) {
  if (shouldSample()) {
    req.span = startSpan(req.method, req.path);
    res.on('finish', () => req.span.end(res.statusCode));
  }
  next();
}

function startSpan(method, path) {
  return { method, path, startedAt: process.hrtime.bigint(), end() {} };
}

module.exports = { traceMiddleware, shouldSample };

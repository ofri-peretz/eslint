/**
 * SAFE (adversarial) - local bindings named after packages, and a locally
 * defined `require`-shaped loader that never touches the registry. The only
 * real module specifiers here are correct.
 */
import express from 'express';

const loadsh = { chunk: (xs, n) => xs.reduce((acc, x, i) => ((acc[Math.floor(i / n)] ??= []).push(x), acc), []) };

function raect(tag, props, ...children) {
  return { tag, props, children };
}

export function buildApp(registry) {
  const app = express();
  const load = (name) => registry[name];
  app.get('/tree', (_req, res) => res.json(raect('ul', null, loadsh.chunk(load('items') ?? [], 5))));
  return app;
}

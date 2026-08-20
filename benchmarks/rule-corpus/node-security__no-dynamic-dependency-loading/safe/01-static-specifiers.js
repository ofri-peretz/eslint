/**
 * SAFE - the remediation the rule's own message asks for: every specifier is a
 * literal fixed at authoring time, in all four loader forms.
 */
import express from 'express';

const fs = require('node:fs');
const { createHash } = require('node:crypto');

export async function boot() {
  const { default: helmet } = await import('helmet');
  const app = express();
  app.use(helmet());
  app.get('/etag', (_req, res) => {
    const bytes = fs.readFileSync('./package.json');
    res.send(createHash('sha256').update(bytes).digest('hex'));
  });
  return app;
}

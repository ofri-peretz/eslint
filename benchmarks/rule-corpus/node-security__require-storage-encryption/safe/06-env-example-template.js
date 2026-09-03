/**
 * SAFE - scaffolding writes a .env.example with placeholder VALUES and no
 * secrets. The keys name credentials because that is what the file documents;
 * every value is the literal string a developer has to replace.
 */
const fs = require('node:fs');

const TEMPLATE = [
  'DATABASE_URL=postgres://localhost:5432/app',
  'SESSION_SECRET=replace-me',
  'STRIPE_API_KEY=replace-me',
].join('\n');

function scaffoldEnvExample(dest) {
  fs.writeFileSync(dest, TEMPLATE);
}

module.exports = { scaffoldEnvExample };

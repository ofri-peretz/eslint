/**
 * VULNERABLE - the same write, spelled with a destructured import. The API key
 * lands on disk in the clear; only the call shape differs from 01.
 */
const { writeFileSync } = require('node:fs');

function seedIntegration(dest, apiKey) {
  writeFileSync(dest, apiKey, 'utf8');
}

module.exports = { seedIntegration };

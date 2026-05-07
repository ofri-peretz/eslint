/**
 * ESLint Benchmark Config
 *
 * Loads ALL Interlace security plugins with 'error' for all rules.
 * Used by the CWE benchmark scorer (benchmarks/score.mjs).
 *
 * Requires tsx: `npx tsx node_modules/.bin/eslint --config eslint.benchmark.config.mjs`
 */

const secureCodingModule = await import('./packages/eslint-plugin-secure-coding/src/index.ts');
const nodeSecurityModule = await import('./packages/eslint-plugin-node-security/src/index.ts');
const pgModule = await import('./packages/eslint-plugin-pg/src/index.ts');
const cryptoModule = await import('./packages/eslint-plugin-crypto/src/index.ts');
const expressModule = await import('./packages/eslint-plugin-express-security/src/index.ts');
const browserModule = await import('./packages/eslint-plugin-browser-security/src/index.ts');
const jwtModule = await import('./packages/eslint-plugin-jwt/src/index.ts');
const mongodbModule = await import('./packages/eslint-plugin-mongodb-security/src/index.ts');
const nestjsModule = await import('./packages/eslint-plugin-nestjs-security/src/index.ts');
const lambdaModule = await import('./packages/eslint-plugin-lambda-security/src/index.ts');
const vercelAiModule = await import('./packages/eslint-plugin-vercel-ai-security/src/index.ts');

// Normalize default/named exports
const normalize = (m) => m.default || m;
const secureCoding = normalize(secureCodingModule);
const nodeSecurity = normalize(nodeSecurityModule);
const pg = normalize(pgModule);
const crypto = normalize(cryptoModule);
const expressSecurity = normalize(expressModule);
const browserSecurity = normalize(browserModule);
const jwt = normalize(jwtModule);
const mongodbSecurity = normalize(mongodbModule);
const nestjsSecurity = normalize(nestjsModule);
const lambdaSecurity = normalize(lambdaModule);
const vercelAiSecurity = normalize(vercelAiModule);

function allRulesError(pluginName, plugin) {
  const rules = {};
  const ruleSource = plugin.rules || {};
  for (const ruleName of Object.keys(ruleSource)) {
    rules[`${pluginName}/${ruleName}`] = 'error';
  }
  return rules;
}

export default [
  {
    files: ['**/*.js'],
    plugins: {
      'secure-coding': secureCoding,
      'node-security': nodeSecurity,
      pg,
      crypto,
      'express-security': expressSecurity,
      'browser-security': browserSecurity,
      jwt,
      'mongodb-security': mongodbSecurity,
      'nestjs-security': nestjsSecurity,
      'lambda-security': lambdaSecurity,
      'vercel-ai-security': vercelAiSecurity,
    },
    rules: {
      ...allRulesError('secure-coding', secureCoding),
      ...allRulesError('node-security', nodeSecurity),
      ...allRulesError('pg', pg),
      ...allRulesError('crypto', crypto),
      ...allRulesError('express-security', expressSecurity),
      ...allRulesError('browser-security', browserSecurity),
      ...allRulesError('jwt', jwt),
      ...allRulesError('mongodb-security', mongodbSecurity),
      ...allRulesError('nestjs-security', nestjsSecurity),
      ...allRulesError('lambda-security', lambdaSecurity),
      ...allRulesError('vercel-ai-security', vercelAiSecurity),
    },
  },
];

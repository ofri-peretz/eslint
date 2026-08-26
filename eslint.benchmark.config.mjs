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
const pgModule = await import('./packages/eslint-plugin-postgresql-security/src/index.ts');
const expressModule = await import('./packages/eslint-plugin-express-security/src/index.ts');
const browserModule = await import('./packages/eslint-plugin-browser-security/src/index.ts');
const jwtModule = await import('./packages/eslint-plugin-jwt-security/src/index.ts');
const mongodbModule = await import('./packages/eslint-plugin-mongodb-security/src/index.ts');
const nestjsModule = await import('./packages/eslint-plugin-nestjs-security/src/index.ts');
const lambdaModule = await import('./packages/eslint-plugin-lambda-security/src/index.ts');
const vercelAiModule = await import('./packages/eslint-plugin-vercel-ai-security/src/index.ts');
// The benchmark scored 234 of 374 rules because these fifteen plugins were
// never loaded — import-next (55 rules) and react-a11y (37) among them. A rule
// the harness cannot load has no precision number and never will.
const importNextModule = await import('./packages/eslint-plugin-import-next/src/index.ts');
const reactA11yModule = await import('./packages/eslint-plugin-react-a11y/src/index.ts');
const modularityModule = await import('./packages/eslint-plugin-modularity/src/index.ts');
const knexSecurityModule = await import('./packages/eslint-plugin-knex-security/src/index.ts');
const drizzleSecurityModule = await import('./packages/eslint-plugin-drizzle-security/src/index.ts');
const mcpSdkSecurityModule = await import('./packages/eslint-plugin-mcp-sdk-security/src/index.ts');
const modernizationModule = await import('./packages/eslint-plugin-modernization/src/index.ts');
const prismaSecurityModule = await import('./packages/eslint-plugin-prisma-security/src/index.ts');
const sequelizeSecurityModule = await import('./packages/eslint-plugin-sequelize-security/src/index.ts');
const typeormSecurityModule = await import('./packages/eslint-plugin-typeorm-security/src/index.ts');
const anthropicSecurityModule = await import('./packages/eslint-plugin-anthropic-security/src/index.ts');
const geminiSecurityModule = await import('./packages/eslint-plugin-gemini-security/src/index.ts');
const mysqlSecurityModule = await import('./packages/eslint-plugin-mysql-security/src/index.ts');
const openaiSecurityModule = await import('./packages/eslint-plugin-openai-security/src/index.ts');
const sqliteSecurityModule = await import('./packages/eslint-plugin-sqlite-security/src/index.ts');

// Normalize default/named exports
const normalize = (m) => m.default || m;
const secureCoding = normalize(secureCodingModule);
const nodeSecurity = normalize(nodeSecurityModule);
const pg = normalize(pgModule);
const expressSecurity = normalize(expressModule);
const browserSecurity = normalize(browserModule);
const jwt = normalize(jwtModule);
const mongodbSecurity = normalize(mongodbModule);
const nestjsSecurity = normalize(nestjsModule);
const lambdaSecurity = normalize(lambdaModule);
const vercelAiSecurity = normalize(vercelAiModule);
const importNext = normalize(importNextModule);
const reactA11y = normalize(reactA11yModule);
const modularity = normalize(modularityModule);
const knexSecurity = normalize(knexSecurityModule);
const drizzleSecurity = normalize(drizzleSecurityModule);
const mcpSdkSecurity = normalize(mcpSdkSecurityModule);
const modernization = normalize(modernizationModule);
const prismaSecurity = normalize(prismaSecurityModule);
const sequelizeSecurity = normalize(sequelizeSecurityModule);
const typeormSecurity = normalize(typeormSecurityModule);
const anthropicSecurity = normalize(anthropicSecurityModule);
const geminiSecurity = normalize(geminiSecurityModule);
const mysqlSecurity = normalize(mysqlSecurityModule);
const openaiSecurity = normalize(openaiSecurityModule);
const sqliteSecurity = normalize(sqliteSecurityModule);

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
      'express-security': expressSecurity,
      'browser-security': browserSecurity,
      jwt,
      'mongodb-security': mongodbSecurity,
      'nestjs-security': nestjsSecurity,
      'lambda-security': lambdaSecurity,
      'vercel-ai-security': vercelAiSecurity,
      'import-next': importNext,
      'react-a11y': reactA11y,
      'modularity': modularity,
      'knex-security': knexSecurity,
      'drizzle-security': drizzleSecurity,
      'mcp-sdk-security': mcpSdkSecurity,
      'modernization': modernization,
      'prisma-security': prismaSecurity,
      'sequelize-security': sequelizeSecurity,
      'typeorm-security': typeormSecurity,
      'anthropic-security': anthropicSecurity,
      'gemini-security': geminiSecurity,
      'mysql-security': mysqlSecurity,
      'openai-security': openaiSecurity,
      'sqlite-security': sqliteSecurity,
    },
    rules: {
      ...allRulesError('secure-coding', secureCoding),
      ...allRulesError('node-security', nodeSecurity),
      ...allRulesError('pg', pg),
      ...allRulesError('express-security', expressSecurity),
      ...allRulesError('browser-security', browserSecurity),
      ...allRulesError('jwt', jwt),
      ...allRulesError('mongodb-security', mongodbSecurity),
      ...allRulesError('nestjs-security', nestjsSecurity),
      ...allRulesError('lambda-security', lambdaSecurity),
      ...allRulesError('vercel-ai-security', vercelAiSecurity),
      ...allRulesError('import-next', importNext),
      ...allRulesError('react-a11y', reactA11y),
      ...allRulesError('modularity', modularity),
      ...allRulesError('knex-security', knexSecurity),
      ...allRulesError('drizzle-security', drizzleSecurity),
      ...allRulesError('mcp-sdk-security', mcpSdkSecurity),
      ...allRulesError('modernization', modernization),
      ...allRulesError('prisma-security', prismaSecurity),
      ...allRulesError('sequelize-security', sequelizeSecurity),
      ...allRulesError('typeorm-security', typeormSecurity),
      ...allRulesError('anthropic-security', anthropicSecurity),
      ...allRulesError('gemini-security', geminiSecurity),
      ...allRulesError('mysql-security', mysqlSecurity),
      ...allRulesError('openai-security', openaiSecurity),
      ...allRulesError('sqlite-security', sqliteSecurity),
    },
  },
];

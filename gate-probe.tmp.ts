/* Module-system gate probe. Run: npx tsx <this file> */
import { Linter } from 'eslint';
import * as parserNs from '@typescript-eslint/parser';
const parser = (parserNs as any).default ?? parserNs;

const R = '/Users/ofri/repos/ofriperetz.dev/eslint-jwt-prefix/packages';

interface Case {
  name: string;
  dir: string;
  rule: string;
  lib: string;          // package specifier
  def: string;          // default-ish binding name
  named: string;        // named export
  violation: string;    // code that violates, independent of binding
  filename?: string;
}

const CASES: Case[] = [
  { name: 'anthropic', dir: 'eslint-plugin-anthropic-security', rule: 'no-hardcoded-api-key',
    lib: '@anthropic-ai/sdk', def: 'Anthropic', named: 'Anthropic',
    violation: `const client = new Anthropic({ apiKey: 'sk-ant-hardcoded' });` },
  { name: 'drizzle', dir: 'eslint-plugin-drizzle-security', rule: 'no-unsafe-query',
    lib: 'drizzle-orm', def: 'drizzleDefault', named: 'drizzle',
    violation: `db.execute(sql.raw('SELECT * FROM users WHERE id = ' + id));` },
  { name: 'gemini', dir: 'eslint-plugin-gemini-security', rule: 'no-disabled-safety-settings',
    lib: '@google/generative-ai', def: 'genai', named: 'GoogleGenerativeAI',
    violation: `const cfg = { safetySettings: [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }] };` },
  { name: 'jwt', dir: 'eslint-plugin-jwt-security', rule: 'no-hardcoded-secret',
    lib: 'jsonwebtoken', def: 'jwt', named: 'sign',
    violation: `jwt.sign(payload, 'super-secret-value');` },
  { name: 'knex', dir: 'eslint-plugin-knex-security', rule: 'no-unsafe-query',
    lib: 'knex', def: 'knex', named: 'knex',
    violation: `db.raw('SELECT * FROM users WHERE id = ' + id);` },
  { name: 'mcp-sdk', dir: 'eslint-plugin-mcp-sdk-security', rule: 'no-command-injection-in-tool',
    lib: '@modelcontextprotocol/sdk/server/mcp.js', def: 'mcp', named: 'McpServer',
    violation: `server.registerTool('run', cfg, async ({ cmd }) => { execSync(cmd); });` },
  { name: 'mysql', dir: 'eslint-plugin-mysql-security', rule: 'no-unsafe-query',
    lib: 'mysql2', def: 'mysql', named: 'createConnection',
    violation: `conn.query('SELECT * FROM users WHERE id = ' + id);` },
  { name: 'openai', dir: 'eslint-plugin-openai-security', rule: 'no-hardcoded-api-key',
    lib: 'openai', def: 'OpenAI', named: 'OpenAI',
    violation: `const client = new OpenAI({ apiKey: 'sk-proj-hardcoded' });` },
  { name: 'prisma', dir: 'eslint-plugin-prisma-security', rule: 'no-unsafe-query',
    lib: '@prisma/client', def: 'prismaNs', named: 'PrismaClient',
    violation: `prisma.$queryRawUnsafe('SELECT * FROM users WHERE id = ' + id);` },
  { name: 'sequelize', dir: 'eslint-plugin-sequelize-security', rule: 'no-unsafe-query',
    lib: 'sequelize', def: 'SequelizeDefault', named: 'Sequelize',
    violation: `sequelize.query('SELECT * FROM users WHERE id = ' + id);` },
  { name: 'sqlite', dir: 'eslint-plugin-sqlite-security', rule: 'no-unsafe-query',
    lib: 'better-sqlite3', def: 'Database', named: 'Database',
    violation: `db.exec('SELECT * FROM users WHERE id = ' + id);` },
  { name: 'typeorm', dir: 'eslint-plugin-typeorm-security', rule: 'no-unsafe-query',
    lib: 'typeorm', def: 'typeormNs', named: 'DataSource',
    violation: `ds.query('SELECT * FROM users WHERE id = ' + id);` },
  { name: 'postgresql', dir: 'eslint-plugin-postgresql-security', rule: 'no-unsafe-query',
    lib: 'pg', def: 'pg', named: 'Pool',
    violation: `client.query('SELECT * FROM users WHERE id = ' + id);` },
  { name: 'mongodb', dir: 'eslint-plugin-mongodb-security', rule: 'no-hardcoded-connection-string',
    lib: 'mongoose', def: 'mongooseDefault', named: 'Schema',
    violation: `const uri = 'mongodb://admin:hunter2@localhost:27017/app';`, filename: 'service.ts' },
  { name: 'express', dir: 'eslint-plugin-express-security', rule: 'no-permissive-cors',
    lib: 'express', def: 'expressDefault', named: 'Router',
    violation: `app.use(cors({ origin: '*' }));` },
  { name: 'lambda', dir: 'eslint-plugin-lambda-security', rule: 'no-error-swallowing',
    lib: 'aws-sdk', def: 'AWS', named: 'S3',
    violation: `const run = () => { try { riskyOperation(); } catch (error) {} };` },
  { name: 'vercel-ai', dir: 'eslint-plugin-vercel-ai-security', rule: 'no-hardcoded-api-keys',
    lib: 'ai', def: 'aiNs', named: 'generateText',
    violation: `const config = { apiKey: 'sk-proj-1234567890abcdefghijklmnopqrstuvwxyz123456' };`,
    filename: 'route.ts' },
  { name: 'nestjs', dir: 'eslint-plugin-nestjs-security', rule: 'no-exposed-private-fields',
    lib: '@nestjs/common', def: 'nestCommon', named: 'Injectable',
    violation: `@Entity()\nexport class User { private password: string; }` },
];

type Form = { key: string; wrap: (c: Case) => string };

const FORMS: Form[] = [
  { key: 'import-default', wrap: (c) => `import ${c.def} from '${c.lib}';\n${c.violation}` },
  { key: 'import-named', wrap: (c) => `import { ${c.named} } from '${c.lib}';\n${c.violation}` },
  { key: 'require-default', wrap: (c) => `const ${c.def} = require('${c.lib}');\n${c.violation}` },
  { key: 'require-destructure', wrap: (c) => `const { ${c.named} } = require('${c.lib}');\n${c.violation}` },
  { key: 'import-equals', wrap: (c) => `import ${c.def} = require('${c.lib}');\n${c.violation}` },
  { key: 'dynamic-import', wrap: (c) => `export async function boot() { const { ${c.named} } = await import('${c.lib}'); return ${c.named}; }\n${c.violation}` },
  { key: 'NONE (control)', wrap: (c) => c.violation },
];

const run = async () => {
  const rows: string[] = [];
  for (const c of CASES) {
    const mod = await import(`${R}/${c.dir}/src/index.ts`);
    const plugin = (mod.default ?? mod) as { rules: Record<string, unknown> };
    if (!plugin.rules[c.rule]) { rows.push(`${c.name}\tMISSING RULE ${c.rule}`); continue; }
    const results: string[] = [];
    for (const f of FORMS) {
      const linter = new Linter({ configType: 'flat' });
      const code = f.wrap(c);
      let msgs: Linter.LintMessage[] = [];
      try {
        msgs = linter.verify(code, {
          files: ['**/*.ts'],
          languageOptions: {
            parser: parser as unknown as Linter.Parser,
            parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: false } },
          },
          plugins: { s: plugin as unknown as Linter.Plugin },
          rules: { [`s/${c.rule}`]: 'error' },
        }, c.filename ?? 'sample.ts');
      } catch (e) { results.push(`${f.key}=THROW`); continue; }
      const fatal = msgs.filter((m) => !m.ruleId);
      if (fatal.length) { results.push(`${f.key}=PARSE_ERR(${fatal[0].message})`); continue; }
      results.push(`${f.key}=${msgs.length > 0 ? 'REPORT' : 'silent'}`);
    }
    rows.push(`${c.name.padEnd(12)} ${c.rule.padEnd(30)} ${results.join('  ')}`);
  }
  console.log(rows.join('\n'));
};

run().catch((e) => { console.error(e); process.exit(1); });

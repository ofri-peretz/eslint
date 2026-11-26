/**
 * The one-screen /llms.txt.
 *
 * The file this replaces listed every docs page (about 100 KB), which is not an
 * index: a tool that loads llms.txt into context truncates it and charges the
 * reader for the tail. The llms.txt convention is a short map with one line per
 * link. The exhaustive page list now leads /llms-full.txt instead.
 *
 * Pure on purpose (no fumadocs import) so a lock test can read it without the
 * generated collections. src/__tests__/llms-index-lock.test.ts holds it to a
 * size budget, resolves every link to a real docs page, and checks every plugin
 * in the security-linting skill's stack map is listed.
 */

export const SITE = 'https://eslint.interlace.tools';

type Plugin = readonly [pkg: string, when: string];

/** Security plugins by the dependency that makes them relevant. */
export const PLUGINS: readonly Plugin[] = [
  [
    'secure-coding',
    'any JS/TS project: injection, hardcoded credentials, unsafe deserialization, ReDoS',
  ],
  [
    'node-security',
    'code that runs on Node: shell and path injection, SSRF, weak crypto, TLS checks off',
  ],
  ['express-security', 'express: helmet, CORS, cookies, CSRF, open redirects'],
  ['nestjs-security', '@nestjs/*: guards, ValidationPipe, throttling, CORS'],
  [
    'browser-security',
    'react, vue, svelte, any browser code: innerHTML, postMessage, token storage',
  ],
  [
    'jwt-security',
    'jsonwebtoken, jose, express-jwt: none algorithm, missing allowlist, hardcoded secrets',
  ],
  [
    'postgresql-security',
    'pg, pg-promise, postgres, slonik: SQL built from strings, TLS off',
  ],
  ['mysql-security', 'mysql2, mysql: SQL built from strings'],
  ['mongodb-security', 'mongodb, mongoose: operator injection, $where'],
  ['sqlite-security', 'better-sqlite3, sqlite3: SQL built from strings'],
  ['knex-security', 'knex: SQL built from strings'],
  ['prisma-security', '@prisma/client: raw query injection'],
  ['drizzle-security', 'drizzle-orm: raw query injection'],
  ['sequelize-security', 'sequelize: raw query injection'],
  ['typeorm-security', 'typeorm: raw query injection'],
  [
    'grpc-security',
    '@grpc/grpc-js: reflection, identity, plaintext, logging, deadlines',
  ],
  [
    'supabase-security',
    '@supabase/supabase-js: service_role key in client code',
  ],
  [
    'mcp-sdk-security',
    '@modelcontextprotocol/*: tool arguments reaching shell, fs, SQL, fetch',
  ],
  ['openai-security', 'openai: literal API keys, browser exposure'],
  [
    'anthropic-security',
    '@anthropic-ai/sdk: literal API keys, browser exposure',
  ],
  [
    'gemini-security',
    '@google/genai: literal API keys, disabled safety filters',
  ],
  [
    'vercel-ai-security',
    'ai (Vercel AI SDK): unvalidated prompts, unsafe output handling',
  ],
  [
    'lambda-security',
    'aws-lambda, @middy/core: credentials, wildcard CORS, SSRF',
  ],
];

export function buildLlmsIndex(): string {
  const lines: string[] = [
    '# Interlace ESLint plugins',
    '',
    '> ESLint plugins for JavaScript and TypeScript security. Flat config for ESLint 9 and 10. Use them next to eslint-plugin-security, not instead of it.',
    '',
    '## Start here',
    '',
    `- [Use alongside eslint-plugin-security](${SITE}/docs/getting-started/with-eslint-plugin-security): the config, and what each finds on our own corpus (2026-11-15): 74 of 100 vulnerable samples only Interlace, 1 only eslint-plugin-security, 11 neither.`,
    `- [Measured on NodeGoat, DVNA and Juice Shop](${SITE}/docs/getting-started/security-alternative-benchmark): 72 documented flaws, 2026-11-20. Ours found 19, eslint-plugin-security 4.2.1 found 3, neither 53. Training apps, rules fixed after earlier runs, AI labellers; read the caveats.`,
    `- [Flat config](${SITE}/docs/getting-started/flat-config): eslint.config.mjs setup. Each preset is one object in the array; do not spread it.`,
    `- [Claude Code](${SITE}/docs/integrations/claude-code) and [Cursor](${SITE}/docs/integrations/cursor)`,
    '- Agent skill that detects your stack and writes the config: `npx skills add ofri-peretz/eslint`, or in Claude Code `claude plugin marketplace add ofri-peretz/eslint` then `claude plugin install interlace@interlace`. Source: https://github.com/ofri-peretz/eslint/tree/main/skills/security-linting',
    '',
    '## Install by what the project depends on',
    '',
    "Install a plugin below with `npm i -D <package>`, then `import x from '<package>'; export default [x.configs.recommended];`. Needs Node 22.13+.",
    '',
    ...PLUGINS.map(
      ([name, when]) =>
        `- [eslint-plugin-${name}](${SITE}/docs/security/plugin-${name}): ${when}`,
    ),
    '',
    '## Limits',
    '',
    '- Rules are patterns inside one file: no taint tracking across files, no dependency or secret-history scanning.',
    `- Full docs text: ${SITE}/llms-full.txt (large). Every package ships an AGENTS.md with its presets and rules.`,
    '',
  ];
  return lines.join('\n');
}

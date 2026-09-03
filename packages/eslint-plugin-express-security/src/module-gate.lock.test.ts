/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock: no rule in this plugin reports in a file with no Express in
 * it.
 *
 * Measured over 107,382 files in 108 repositories, **75% of everything this
 * plugin reported (4,450 of 5,921 findings) was in a file with no Express
 * import** — `no-missing-csrf-protection` alone contributed 3,556.
 *
 * Written over the whole rule registry rather than per rule, so a rule added
 * later is covered the day it lands: it will fail here until it is gated too.
 * Revert the gate in any single rule and this test goes red.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import plugin from './index';

const RULES = Object.keys(plugin.rules);

/**
 * Shapes that drew findings from this plugin across the corpus while having no
 * Express in them. The `node:http` and Next.js cases matter most: both use the
 * two-argument `(req, res)` form, which is exactly why the gate's signature arm
 * requires the three-argument middleware contract instead.
 */
const NON_EXPRESS_SOURCES: ReadonlyArray<readonly [string, string]> = [
  [
    'a node:http server',
    `import http from 'node:http';
     http.createServer((req, res) => {
       res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
       res.end(req.url);
     }).listen(3000);`,
  ],
  [
    'a Next.js API route',
    `export default function handler(req, res) {
       res.setHeader('Access-Control-Allow-Origin', '*');
       res.json({ path: req.query.path });
     }`,
  ],
  [
    'a Fastify server',
    `import fastify from 'fastify';
     const app = fastify();
     app.get('/users', async (request, reply) => reply.send({ ok: true }));`,
  ],
  [
    'a React component',
    `export default function Panel({ items }) {
       return items.map((i) => i.name).join(', ');
     }`,
  ],
  [
    'a config module',
    `export const config = {
       cookie: { secure: false, httpOnly: false },
       cors: { origin: '*' },
     };`,
  ],
  [
    'a local module merely named express',
    `import express from './express';
     const app = express();
     app.use((req, res) => res.send('x'));`,
  ],
];

const lint = (code: string, rule: string): Linter.LintMessage[] => {
  // The declared ESLint floor for this package is 8.40, where `new Linter()`
  // still defaults to eslintrc — a flat config would be ignored there and every
  // rule silently skipped, which is the vacuous pass this lock exists to catch.
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(
    code,
    {
      files: ['**/*.ts'],
      languageOptions: {
        parser: parser as unknown as Linter.Parser,
        parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      },
      plugins: { xp: plugin as unknown as Linter.Plugin },
      rules: { [`xp/${rule}`]: 'error' },
    },
    // Without a filename the Linter lints `<input>`, which matches no `files`
    // entry — so every rule is skipped and every negative below passes without
    // running a rule at all. The positive controls below are what catch that.
    'server.ts',
  );
};

describe('Express module gate', () => {
  it('the registry is non-empty, so the sweep below is not vacuous', () => {
    expect(RULES.length).toBeGreaterThan(0);
  });

  describe.each(NON_EXPRESS_SOURCES)('%s', (_name, code) => {
    it.each(RULES)('xp/%s reports nothing', (rule) => {
      const messages = lint(code, rule);
      // A parse or config error also produces zero *rule* findings, so it is
      // asserted away rather than counted as a pass.
      expect(messages.filter((m) => !m.ruleId)).toHaveLength(0);
      expect(messages).toHaveLength(0);
    });
  });

  describe('positive controls — the gate must open for real Express code', () => {
    // `app.use(cors({ origin: '*' }))` is the shape no-permissive-cors keys on.
    // No `credentials: true`: that combination is owned by
    // no-cors-credentials-wildcard under the rule partition, and this lock is
    // about the module gate, not about which CORS rule reports.
    const permissive = `app.use(cors({ origin: '*' }));`;

    it('reports once the file imports express', () => {
      const code = `import express from 'express';
        import cors from 'cors';
        const app = express();
        ${permissive}`;
      expect(lint(code, 'no-permissive-cors').length).toBeGreaterThan(0);
    });

    it('reports on the (req, res, next) middleware contract with no express import', () => {
      const code = `import cors from 'cors';
        export function setup(app) { ${permissive} }
        export function guard(req, res, next) { next(); }`;
      expect(lint(code, 'no-permissive-cors').length).toBeGreaterThan(0);
    });

    it("opens on TypeScript's import-equals form", () => {
      // `import express = require('express')` is a TSImportEqualsDeclaration,
      // not a require CallExpression. The false-negative audit found 82 corpus
      // files written this way with every rule in the plugin silenced.
      const code = `import express = require('express');
        import cors from 'cors';
        const app = express();
        ${permissive}`;
      expect(lint(code, 'no-permissive-cors').length).toBeGreaterThan(0);
    });

    it("opens on Deno's npm: specifier", () => {
      const code = `import express from 'npm:express';
        import cors from 'cors';
        ${permissive}`;
      expect(lint(code, 'no-permissive-cors').length).toBeGreaterThan(0);
    });

    it('opens on a deno.land/x URL import', () => {
      const code = `import express from 'https://deno.land/x/express@v1.0.0/mod.ts';
        import cors from 'cors';
        ${permissive}`;
      expect(lint(code, 'no-permissive-cors').length).toBeGreaterThan(0);
    });

    it('and stays silent on that same call with neither present', () => {
      const code = `import cors from 'cors';
        export function setup(app) { ${permissive} }`;
      expect(lint(code, 'no-permissive-cors')).toHaveLength(0);
    });
  });
});

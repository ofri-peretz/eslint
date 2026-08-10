/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The per-PR half of ILB-Corpus-Truth.
 *
 * The bench itself measures 107 repositories and cannot run on every pull
 * request. This lock asks the same question in seconds, on a handful of files
 * that use no SDK at all: **does every rule in an SDK-specific plugin stay
 * silent in a file that has nothing to do with it?**
 *
 * That single question would have caught all four defects fixed on 2026-08-10:
 * postgresql-security reporting in files with no PostgreSQL client (94% of its
 * findings), lambda-security on any `try/catch` (98%), express-security on
 * `node:http` servers (75%), and the seven SQL plugins reporting each other's
 * findings.
 *
 * ## The ratchet
 *
 * `UNGATED` lists plugins that have not been fixed yet, so this suite can land
 * before the work is finished without being disabled. It is a ratchet in both
 * directions:
 *
 *   - a **gated** plugin that starts reporting off-SDK → red
 *   - an **ungated** plugin that becomes clean → red, telling you to delete its
 *     entry, so the list cannot quietly outlive the problem
 *   - a **new** SDK plugin with no gate → red, because it is on neither list
 *
 * Do not add entries to `UNGATED` to make a failure go away. An entry there is
 * a debt with a number attached; the fix is the gate.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import { SDK_PACKAGES } from '../suites/ilb-corpus-truth/sdk-map.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');

/**
 * Plugins with no module gate yet, and the off-SDK findings each produced in
 * the 2026-08-10 corpus run. Ordered by that number — it is the work queue.
 *
 * @see NEXT-LEVEL-PLAN.md item 6
 */
/**
 * SDK plugins that do not yet ship `src/module-gate.lock.test.ts`, with the
 * off-SDK findings each produced in the 2026-08-10 corpus run. Sorted by that
 * number — it is the work queue, in priority order.
 *
 * Two different debts live here, and the distinction matters:
 *
 *   - **No gate at all.** vercel-ai, mongodb, jwt, nestjs and the four AI-SDK
 *     plugins have no evidence probe. The fix is the gate.
 *   - **Gated, lock still owed.** The seven SQL plugins abstain correctly —
 *     `createSqlInjectionRule` takes a `modules` list and they measure 0 off-SDK
 *     — but the guarantee lives in the devkit factory, so nothing fails if a
 *     hand-written rule is added to one of them tomorrow. The fix is the lock.
 *
 * A zero here never means "safe". openai/anthropic/gemini/mcp-sdk report nothing
 * off-SDK today only because the corpus barely exercises them: "did not happen
 * to fire" is not "cannot".
 *
 * @see NEXT-LEVEL-PLAN.md items 4 and 6
 */
const UNGATED: Readonly<Record<string, number>> = {
  // No gate at all — ordered by measured blast radius.
  'vercel-ai-security': 1738,
  'mongodb-security': 1663,
  'nestjs-security': 219,
  // Effectively gated already: `isJwtLibraryCall` requires the file to import a
  // JWT library, which took it from 702 off-SDK findings to 27. What it still
  // owes is the registry-wide lock, so the property cannot be lost by a rule
  // that skips the helper.
  'jwt-security': 27,
  'openai-security': 0,
  'anthropic-security': 0,
  'gemini-security': 0,
  'mcp-sdk-security': 0,
  // Gated by the devkit SQL factory; measured 0 off-SDK. Owed a registry lock so
  // the property survives the next hand-written rule.
  'typeorm-security': 0,
  'mysql-security': 0,
  'knex-security': 0,
  'drizzle-security': 0,
  'sqlite-security': 0,
  'prisma-security': 0,
  'sequelize-security': 0,
};

/**
 * Files that use no SDK from any of these plugins. Each is a real
 * false-positive shape observed in the corpus, not a synthetic negative.
 */
const NON_SDK_SOURCES: ReadonlyArray<readonly [string, string]> = [
  [
    'a plain JSON parse helper',
    `export function parse(input: string) {
       try { return JSON.parse(input); } catch { return null; }
     }`,
  ],
  [
    'a React component',
    `export default function Panel({ items }) {
       return items.map((i) => i.name).join(', ');
     }`,
  ],
  [
    'a node:http server',
    `import http from 'node:http';
     http.createServer((req, res) => {
       res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
       res.end(req.url);
     }).listen(3000);`,
  ],
  [
    'an HTTP client with database-shaped method names',
    `import { api } from './api';
     export async function search(term) {
       const rows = await api.query('SELECT * FROM products WHERE name = ' + term);
       await api.connect();
       return rows;
     }`,
  ],
  [
    'a config module with credentials and env access',
    `export const config = {
       token: process.env.API_TOKEN,
       cookie: { secure: false, httpOnly: false },
       retries: Number(process.env.RETRIES ?? 3),
     };`,
  ],
];

async function loadPlugin(suffix: string): Promise<{
  rules: Record<string, unknown>;
}> {
  const mod = await import(
    `${REPO_ROOT}/packages/eslint-plugin-${suffix}/src/index.ts`
  );
  return (mod.default ?? mod) as { rules: Record<string, unknown> };
}

function lint(
  code: string,
  plugin: { rules: Record<string, unknown> },
  rule: string,
): Linter.LintMessage[] {
  // `configType: 'flat'` because a bare `new Linter()` still defaults to
  // eslintrc on the declared ESLint floor, which would ignore the config below
  // and skip every rule — a suite that passes having run nothing.
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(
    code,
    {
      files: ['**/*.ts'],
      languageOptions: {
        parser: parser as unknown as Linter.Parser,
        parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      },
      plugins: { p: plugin as unknown as Linter.Plugin },
      rules: { [`p/${rule}`]: 'error' },
    },
    // Without a filename the Linter lints `<input>`, which matches no `files`
    // entry — every rule skipped, every assertion below vacuously true.
    'sample.ts',
  );
}

/**
 * A plugin is "gated" if it ships the registry-wide lock that proves it.
 *
 * This is deliberately a **structural** check, not a behavioural one. The first
 * version asked "does this plugin still report on our off-SDK fixtures?" and
 * every ungated plugin passed — not because they were fixed, but because five
 * fixtures cannot reproduce the shapes that produced 1,738 off-SDK findings for
 * vercel-ai in the corpus. A probe that weak reports "you fixed it" for work
 * nobody did, which is worse than no check at all.
 *
 * Whether a plugin *has* a gate is a fact about the source tree, and the file
 * below is exactly what a gate is required to ship with.
 */
function hasGateLock(suffix: string): boolean {
  return fs.existsSync(
    path.join(
      REPO_ROOT,
      'packages',
      `eslint-plugin-${suffix}`,
      'src',
      'module-gate.lock.test.ts',
    ),
  );
}

const GATED = Object.keys(SDK_PACKAGES).filter(hasGateLock);

describe('SDK module-gate coverage', () => {
  it('every plugin in the SDK map is classified as gated or ungated', () => {
    const unknown = Object.keys(UNGATED).filter((p) => !(p in SDK_PACKAGES));
    expect(unknown, 'UNGATED names a plugin absent from SDK_PACKAGES').toEqual([]);
    expect(GATED.length + Object.keys(UNGATED).length).toBe(
      Object.keys(SDK_PACKAGES).length,
    );
  });

  it('there is at least one gated plugin, so the sweep below is not vacuous', () => {
    expect(GATED.length).toBeGreaterThan(0);
  });

  describe.each(GATED)('%s (gated)', (suffix) => {
    it.each(NON_SDK_SOURCES)('reports nothing in %s', async (_name, code) => {
      const plugin = await loadPlugin(suffix);
      const rules = Object.keys(plugin.rules);
      expect(rules.length).toBeGreaterThan(0);
      for (const rule of rules) {
        const messages = lint(code, plugin, rule);
        // A parse or config error also yields zero *rule* findings, so it is
        // asserted away rather than counted as a pass.
        expect(
          messages.filter((m) => !m.ruleId),
          `${suffix}/${rule} produced a parse or config error`,
        ).toHaveLength(0);
        expect(
          messages.map((m) => m.ruleId),
          `${suffix}/${rule} reported in a file with no ${suffix} SDK`,
        ).toEqual([]);
      }
    });
  });

  // The other half of the ratchet: the debt list must match reality exactly, in
  // both directions. Gate a plugin and forget to delete its entry → red. Add a
  // new SDK plugin with no gate → red, because it is on neither list.
  it('UNGATED lists exactly the SDK plugins that ship no module gate', () => {
    const actuallyUngated = Object.keys(SDK_PACKAGES)
      .filter((p) => !hasGateLock(p))
      .sort();
    const declared = Object.keys(UNGATED).sort();
    expect(
      actuallyUngated,
      'Update UNGATED in this file: it no longer matches which plugins ship ' +
        'src/module-gate.lock.test.ts.',
    ).toEqual(declared);
  });

  it('the debt is reported with the number that makes it a priority', () => {
    for (const [plugin, offSdk] of Object.entries(UNGATED)) {
      expect(typeof offSdk, `${plugin} needs its measured off-SDK count`).toBe(
        'number',
      );
    }
  });
});

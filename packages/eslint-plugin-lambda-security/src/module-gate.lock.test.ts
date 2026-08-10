/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock: no rule in this plugin reports in a file that is not Lambda
 * code.
 *
 * Measured over 107,382 files in 108 repositories, **98% of everything this
 * plugin reported (9,244 of 9,473 findings) was in a file with no AWS anything
 * in it** — `no-error-swallowing` alone contributed 5,543, firing on any
 * `try/catch` anywhere while its own description claimed to detect "empty catch
 * blocks in Lambda handlers".
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
 * Shapes that drew findings from this plugin across the corpus while having
 * nothing to do with AWS Lambda. Each is a real false-positive pattern.
 */
const NON_LAMBDA_SOURCES: ReadonlyArray<readonly [string, string]> = [
  [
    'a plain JSON parse helper',
    `export function parse(s: string) {
       try { return JSON.parse(s); } catch { return null; }
     }`,
  ],
  [
    'an Express route',
    `import express from 'express';
     const app = express();
     app.get('/users', (req, res) => {
       try { res.json({ ok: true }); } catch (e) {}
     });`,
  ],
  [
    'a React component',
    `export default function Panel({ data }) {
       try { return data.map((d) => d.name).join(', '); } catch { return ''; }
     }`,
  ],
  [
    'a DOM event listener taking one `event`',
    `document.addEventListener('click', (event) => {
       try { console.log(event.target); } catch {}
     });`,
  ],
  [
    'a config module with env access',
    `export const config = {
       retries: Number(process.env.RETRIES ?? 3),
       token: process.env.API_TOKEN,
     };`,
  ],
  [
    'a local module merely named like the SDK',
    `import AWS from './aws-sdk';
     export function upload(file) {
       try { return AWS.put(file); } catch { return null; }
     }`,
  ],
];

const lint = (code: string, rule: string): Linter.LintMessage[] => {
  // The declared ESLint floor for this package is 8.40, where `new Linter()`
  // still defaults to eslintrc — a flat config would be ignored there and every
  // rule silently skipped, which is the vacuous pass this lock exists to catch.
  const linter = new Linter({ configType: "flat" });
  return linter.verify(
    code,
    {
      files: ['**/*.ts'],
      languageOptions: {
        parser: parser as unknown as Linter.Parser,
        parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      },
      plugins: { l: plugin as unknown as Linter.Plugin },
      rules: { [`l/${rule}`]: 'error' },
    },
    // Without a filename the Linter lints `<input>`, which matches no `files`
    // entry — so every rule is skipped and every negative below passes without
    // running a rule at all. The positive assertions at the bottom of this file
    // are what catch that; keep them.
    'handler.ts',
  );
};

describe('Lambda module gate', () => {
  it('the registry is non-empty, so the sweep below is not vacuous', () => {
    expect(RULES.length).toBeGreaterThan(0);
  });

  describe.each(NON_LAMBDA_SOURCES)('%s', (_name, code) => {
    it.each(RULES)('l/%s reports nothing', (rule) => {
      const messages = lint(code, rule);
      // A parse or config error also produces zero *rule* findings, so it is
      // asserted away rather than counted as a pass.
      expect(messages.filter((m) => !m.ruleId)).toHaveLength(0);
      expect(messages).toHaveLength(0);
    });
  });

  describe('positive controls — the gate must open for real Lambda code', () => {
    const swallowing = `try { riskyOperation(); } catch (error) {}`;

    it("opens on TypeScript's import-equals form", () => {
      const code = `import AWS = require('aws-sdk');\nconst run = () => { ${swallowing} };`;
      expect(lint(code, 'no-error-swallowing').length).toBeGreaterThan(0);
    });

    it('opens on a deno.land/x URL import', () => {
      const code = `import { S3 } from 'https://deno.land/x/aws-sdk@v3.0.0/mod.ts';\nconst run = () => { ${swallowing} };`;
      expect(lint(code, 'no-error-swallowing').length).toBeGreaterThan(0);
    });

    it("opens on Deno's npm: specifier", () => {
      // supabase/examples/**/image_gen/index.ts imports
      // 'npm:@aws-sdk/client-bedrock-runtime'; the prefix silenced the plugin.
      const code = `import { BedrockRuntimeClient } from 'npm:@aws-sdk/client-bedrock-runtime';\nconst run = () => { ${swallowing} };`;
      expect(lint(code, 'no-error-swallowing').length).toBeGreaterThan(0);
    });

    it('reports once the file exports a handler, with no AWS import at all', () => {
      const code = `export const handler = async (event) => { ${swallowing} };`;
      expect(lint(code, 'no-error-swallowing').length).toBeGreaterThan(0);
    });

    it('reports on the (event, context) convention alone', () => {
      const code = `async function run(event, context) { ${swallowing} }`;
      expect(lint(code, 'no-error-swallowing').length).toBeGreaterThan(0);
    });

    it('reports on a type-only aws-lambda import', () => {
      const code = `import type { Handler } from 'aws-lambda';\nfunction f() { ${swallowing} }`;
      expect(lint(code, 'no-error-swallowing').length).toBeGreaterThan(0);
    });

    it('and stays silent on that same catch with none of the three present', () => {
      expect(lint(`function f() { ${swallowing} }`, 'no-error-swallowing')).toHaveLength(0);
    });
  });
});

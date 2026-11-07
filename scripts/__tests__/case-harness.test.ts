/**
 * @provenBy {"file":"scripts/lib/case-harness.ts","find":"  return harness.before + entry.body + harness.after;","replace":"  return entry.body;"}
 *
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import {
  arrayHarnessOf,
  resolveCaseCode,
  replayCode,
  type Harness,
} from '../lib/case-harness.ts';

const ROOT = path.resolve(__dirname, '../..');

const sourceOf = (text: string) =>
  ts.createSourceFile('case.test.ts', text, ts.ScriptTarget.Latest, true);

/** The `code:` initializer of the first object literal in the file that has one. */
function codeIn(source: ts.SourceFile): ts.Expression {
  let found: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (
      !found &&
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'code'
    )
      found = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found!;
}

const resolve = (text: string) => {
  const source = sourceOf(text);
  return resolveCaseCode(codeIn(source), source, 'f.test.ts');
};

describe('resolveCaseCode', () => {
  it('returns a plain fragment with no harness', () => {
    expect(resolve('const c = { code: `app.listen(1)` };')).toEqual({
      body: 'app.listen(1)',
    });
  });

  it('resolves a local const prefix as the harness before the fragment', () => {
    const r = resolve(
      "const SDK = `import express from 'express';\\n`;\nconst c = { code: SDK + `app.use(x)` };",
    );
    expect(r.body).toBe('app.use(x)');
    expect(r.harness).toEqual({
      key: 'f.test.ts#SDK|',
      value: { before: "import express from 'express';\n", after: '' },
    });
  });

  it('resolves a local arrow wrapper into the text either side of its parameter', () => {
    const r = resolve(
      'const PRE = \'import pg from "pg";\';\nconst withPg = (c: string) => `${PRE}\\n${c}\\n// end`;\nconst c = { code: withPg(`pool.query(q)`) };',
    );
    expect(r).toEqual({
      body: 'pool.query(q)',
      harness: {
        key: 'f.test.ts#withPg()',
        value: { before: 'import pg from "pg";\n', after: '\n// end' },
      },
    });
  });

  it('resolves a function-declaration wrapper and a joined multi-line harness', () => {
    const r = resolve(
      "function wrap(code) { return [\"import a from 'a';\", code].join('\\n'); }\nconst c = { code: wrap('a()') };",
    );
    expect(r.body).toBe('a()');
    expect(r.harness?.value).toEqual({
      before: "import a from 'a';\n",
      after: '',
    });
  });

  it('names a harness it cannot resolve instead of guessing', () => {
    const r = resolve(
      "import { asExpress } from './helpers';\nconst c = { code: asExpress(`app.get()`) };",
    );
    expect(r.body).toBeNull();
    expect(r.harness?.value).toEqual({ unresolved: 'asExpress(`app.get()`)' });
  });

  it('evaluates a several-argument generator with static arguments whole', () => {
    const r = resolve(
      'const w = (a, b) => `${a}-${b}`;\nconst c = { code: w(`x`, `y`) };',
    );
    expect(r).toEqual({ body: 'x-y' });
  });
});

describe('arrayHarnessOf', () => {
  const callIn = (source: ts.SourceFile): ts.Expression => {
    let call: ts.Expression | undefined;
    const visit = (n: ts.Node) => {
      if (
        ts.isPropertyAssignment(n) &&
        ts.isIdentifier(n.name) &&
        n.name.text === 'invalid'
      )
        call = n.initializer;
      ts.forEachChild(n, visit);
    };
    visit(source);
    return call!;
  };

  it('finds the wrapper a case-array mapper applies to every code', () => {
    const source = sourceOf(
      "const asX = (code: string) => `import 'x';\\n${code}`;\nconst xp = <T>(cases: T[]): T[] => cases.map((c) => ({ ...c, code: asX(c.code) }));\nconst t = { invalid: xp([{ code: `a()` }]) };",
    );
    expect(arrayHarnessOf(callIn(source), source, 'f.test.ts')).toEqual({
      key: 'f.test.ts#asX()',
      value: { before: "import 'x';\n", after: '' },
    });
  });

  it('is null for a call that maps no code through a wrapper', () => {
    const source = sourceOf(
      'const make = () => [];\nconst t = { invalid: make([]) };',
    );
    expect(arrayHarnessOf(callIn(source), source, 'f.test.ts')).toBeNull();
  });
});

describe('replayCode', () => {
  const harnesses: Record<string, Harness> = {
    'f#A|': { before: 'A;', after: '' },
    'f:3': { unresolved: 'x(y)' },
  };

  it('puts the harness back around the fragment', () => {
    expect(replayCode({ body: 'b()', harness: 'f#A|' }, harnesses)).toBe(
      'A;b()',
    );
  });

  it('replays a case with no harness as itself', () => {
    expect(replayCode({ body: 'b()' }, harnesses)).toBe('b()');
  });

  it('cannot replay an unresolved harness or an unevaluated body', () => {
    expect(replayCode({ body: null, harness: 'f:3' }, harnesses)).toBeNull();
    expect(replayCode({ body: 'b()', harness: 'f:3' }, harnesses)).toBeNull();
    expect(replayCode({}, harnesses)).toBeNull();
  });
});

/*
 * The round trip the intent asks for: take real invalid cases whose code a
 * test file wraps, replay them from fragment + harness alone, and lint them
 * with their own rule. Every one must report — the verdict its suite reaches.
 * Six files cover the shapes in use: a const prefix (SDK, DRIVER, D) and a
 * local wrapper (asExpress, withPg, asAi, asMongo).
 */
const ROUND_TRIP_FILES = [
  'packages/eslint-plugin-anthropic-security/src/rules/no-browser-api-key-exposure/no-browser-api-key-exposure.test.ts',
  'packages/eslint-plugin-drizzle-security/src/rules/no-raw-identifier-interpolation/no-raw-identifier-interpolation.test.ts',
  'packages/eslint-plugin-express-security/src/rules/require-csrf-protection/require-csrf-protection.test.ts',
  'packages/eslint-plugin-postgresql-security/src/rules/prefer-pool-query/prefer-pool-query.test.ts',
  'packages/eslint-plugin-vercel-ai-security/src/rules/require-abort-signal/require-abort-signal.test.ts',
  'packages/eslint-plugin-mongodb-security/src/rules/no-unsafe-where/no-unsafe-where.test.ts',
];

interface Replayed {
  file: string;
  ruleExport: string;
  code: string;
  filename?: string;
}

/** Invalid cases with a resolved harness and no options, in `ruleTester.run(…, X, …)` blocks. */
function harnessedInvalidCases(rel: string): Replayed[] {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const source = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true);
  const out: Replayed[] = [];
  const cache = {};
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'run' &&
      node.arguments.length === 3 &&
      ts.isIdentifier(node.arguments[1]) &&
      ts.isObjectLiteralExpression(node.arguments[2])
    ) {
      const ruleExport = node.arguments[1].text;
      for (const prop of node.arguments[2].properties) {
        if (
          !ts.isPropertyAssignment(prop) ||
          !ts.isIdentifier(prop.name) ||
          prop.name.text !== 'invalid'
        )
          continue;
        const arrayHarness = arrayHarnessOf(
          prop.initializer,
          source,
          rel,
          cache,
        );
        const array = ts.isCallExpression(prop.initializer)
          ? prop.initializer.arguments[0]
          : prop.initializer;
        if (!array || !ts.isArrayLiteralExpression(array)) continue;
        for (const element of array.elements) {
          if (!ts.isObjectLiteralExpression(element)) continue;
          const keys = new Map(
            element.properties
              .filter(ts.isPropertyAssignment)
              .filter((p) => ts.isIdentifier(p.name))
              .map((p) => [(p.name as ts.Identifier).text, p.initializer]),
          );
          if (
            keys.has('options') ||
            keys.has('languageOptions') ||
            keys.has('settings')
          )
            continue;
          const code = keys.get('code');
          if (!code) continue;
          const own = resolveCaseCode(code, source, rel, cache);
          const resolved =
            arrayHarness && !own.harness
              ? { body: own.body, harness: arrayHarness }
              : own;
          if (!resolved.harness || 'unresolved' in resolved.harness.value)
            continue;
          const replay = replayCode(
            { body: resolved.body, harness: resolved.harness.key },
            { [resolved.harness.key]: resolved.harness.value },
          );
          const filename = keys.get('filename');
          if (replay !== null)
            out.push({
              file: rel,
              ruleExport,
              code: replay,
              ...(filename && ts.isStringLiteralLike(filename)
                ? { filename: filename.text }
                : {}),
            });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

describe('a harnessed case replays to its suite verdict', () => {
  const cases = ROUND_TRIP_FILES.flatMap(harnessedInvalidCases);

  it('found harnessed cases in every round-trip file', () => {
    for (const file of ROUND_TRIP_FILES) {
      expect(
        cases.some((c) => c.file === file),
        `${file} yielded no resolved harnessed case — the resolver regressed or the file changed shape`,
      ).toBe(true);
    }
  });

  it.each(ROUND_TRIP_FILES)(
    '%s: every replayed invalid case reports',
    async (file) => {
      const rules = (await import(
        path.join(ROOT, path.dirname(file), 'index.ts')
      )) as Record<string, unknown>;
      const linter = new Linter();
      for (const c of cases.filter((x) => x.file === file)) {
        const rule = rules[c.ruleExport];
        expect(
          rule,
          `${c.ruleExport} is not exported by ${file}'s index`,
        ).toBeDefined();
        const messages = linter.verify(
          c.code,
          [
            {
              files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.mjs', '**/*.cjs'],
              languageOptions: {
                parser: tsParser,
                ecmaVersion: 2022,
                sourceType: 'module',
              },
              plugins: { t: { rules: { r: rule as never } } },
              rules: { 't/r': 'error' },
            },
          ],
          c.filename ?? 'case.ts',
        );
        expect(
          messages.filter((m) => m.ruleId === 't/r').length,
          `replayed case did not report:\n${c.code}\n${messages.map((m) => m.message).join('\n')}`,
        ).toBeGreaterThan(0);
      }
    },
    120_000,
  );
});

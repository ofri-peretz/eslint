/**
 * `createOnce` rules — one rule object, two engines.
 *
 * A rule written in oxlint's shape must behave identically on ESLint (through
 * the `create` the creator derives) and on oxlint (through `createOnce`
 * itself). The properties that matter are the ones the shape changes:
 *
 *   - per-file state is reset in `before`, not by re-running the factory;
 *   - `before` returning `false` skips the file;
 *   - `after` runs once the walk is done, after `Program:exit`;
 *   - options are defaulted per file, and the skip flags still apply.
 *
 * Each case runs on ESLint's `Linter` and on oxlint's `RuleTester`, so a
 * divergence between the two adapters fails here, not in a user's lint run.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import { RuleTester } from 'oxlint/plugins-dev';
import { createRule } from './rule-creator';

RuleTester.describe = describe;
RuleTester.it = it;
const oxlint = new RuleTester({ eslintCompat: true });

type Options = [{ label?: string }];

/** Counts identifiers per file and reports the count at `Program:exit`. */
const counting = createRule<Options, 'count'>({
  name: 'counting',
  meta: {
    type: 'problem',
    docs: { description: 'counts identifiers' },
    schema: [
      {
        type: 'object',
        properties: { label: { type: 'string' } },
        additionalProperties: false,
      },
    ],
    messages: { count: '{{label}}: {{n}}' },
  },
  defaultOptions: [{ label: 'ids' }],
  skipTestFiles: true,
  createOnce(context, options) {
    let n = 0;
    let label = '';
    return {
      before() {
        n = 0;
        label = options()[0].label ?? '';
        if (context.filename.endsWith('skip.js')) return false;
      },
      Identifier() {
        n++;
      },
      'Program:exit'(node) {
        context.report({
          node,
          messageId: 'count',
          data: { label, n: String(n) },
        });
      },
    };
  },
});

/** `after` must see what `Program:exit` left behind, i.e. run after it. */
const ordered = createRule<[], 'after'>({
  name: 'ordered',
  meta: {
    type: 'problem',
    docs: { description: 'after runs last' },
    schema: [],
    messages: { after: 'after saw exit={{exit}}' },
  },
  defaultOptions: [],
  createOnce(context) {
    let exited = false;
    let program: Parameters<typeof context.report>[0]['node'] | null = null;
    return {
      Program(node) {
        exited = false;
        program = node;
      },
      'Program:exit'() {
        exited = true;
      },
      after() {
        context.report({
          node: program!,
          messageId: 'after',
          data: { exit: String(exited) },
        });
      },
    };
  },
});

/** `after` without a `Program:exit` of its own, and no `before`. */
const afterOnly = createRule<[], 'done'>({
  name: 'after-only',
  meta: {
    type: 'problem',
    docs: { description: 'after with no exit visitor' },
    schema: [],
    messages: { done: 'done' },
  },
  defaultOptions: [],
  createOnce(context) {
    let program: Parameters<typeof context.report>[0]['node'] | null = null;
    return {
      Program(node) {
        program = node;
      },
      after() {
        context.report({ node: program!, messageId: 'done' });
      },
    };
  },
});

function eslint(
  rule: unknown,
  code: string,
  filename = 'file.js',
  options: unknown[] = [],
): string[] {
  const linter = new Linter();
  return linter
    .verify(
      code,
      [
        {
          files: ['**/*.js'],
          plugins: { t: { rules: { r: rule as never } } },
          rules: { 't/r': ['error', ...options] as never },
        },
      ],
      filename,
    )
    .map((m) => m.message);
}

describe('createOnce on ESLint (derived create)', () => {
  it('exposes both entry points', () => {
    expect(typeof (counting as { createOnce?: unknown }).createOnce).toBe(
      'function',
    );
    expect(typeof counting.create).toBe('function');
  });

  it('resets per-file state in before, file after file', () => {
    expect(eslint(counting, 'a; b;')).toEqual(['ids: 2']);
    expect(eslint(counting, 'c;')).toEqual(['ids: 1']);
  });

  it('applies defaults, then the user options', () => {
    expect(eslint(counting, 'c;', 'file.js', [{ label: 'L' }])).toEqual([
      'L: 1',
    ]);
  });

  it('skips the file when before returns false', () => {
    expect(eslint(counting, 'a;', 'skip.js')).toEqual([]);
  });

  it('still honours skipTestFiles', () => {
    expect(eslint(counting, 'a;', 'x.test.js')).toEqual([]);
  });

  it('runs after once Program:exit has run', () => {
    expect(eslint(ordered, 'a;')).toEqual(['after saw exit=true']);
  });

  it('runs after when the rule has no Program:exit of its own', () => {
    expect(eslint(afterOnly, 'a;')).toEqual(['done']);
  });
});

/**
 * oxlint's own loop (lint.js `lintFileImpl`): `createOnce` ONCE per run, then
 * per file `before` → walk → `after`, on one shared context whose file-scoped
 * members are swapped underneath it. oxlint's RuleTester rebuilds the visitor
 * per case, so it cannot see state leaking between files; this can.
 */
function oxlintLoop(
  files: { filename: string; identifiers: number; options?: unknown[] }[],
): string[] {
  const reports: string[] = [];
  const context = {
    filename: '',
    options: [] as unknown[],
    sourceCode: { text: '', lines: [''] },
    report: ({ data }: { data: { label: string; n: string } }) =>
      reports.push(`${data.label}: ${data.n}`),
  };
  const visitor = (
    counting as unknown as {
      createOnce(c: unknown): Record<string, (node?: unknown) => unknown>;
    }
  ).createOnce(context);
  for (const file of files) {
    context.filename = file.filename;
    context.options = file.options ?? [];
    if (visitor.before() === false) continue;
    for (let i = 0; i < file.identifiers; i++) visitor.Identifier();
    visitor['Program:exit']({});
  }
  return reports;
}

describe('createOnce on oxlint', () => {
  it('reuses one visitor across files without leaking state', () => {
    expect(
      oxlintLoop([
        { filename: 'a.js', identifiers: 2 },
        { filename: 'skip.js', identifiers: 5 },
        { filename: 'b.test.js', identifiers: 7 },
        { filename: 'c.js', identifiers: 1, options: [{ label: 'L' }] },
        { filename: 'd.js', identifiers: 3 },
      ]),
    ).toEqual(['ids: 2', 'L: 1', 'ids: 3']);
  });

  oxlint.run('counting', counting as never, {
    valid: [
      { code: 'a;', filename: 'skip.js' },
      { code: 'a;', filename: 'x.test.js' },
    ],
    invalid: [
      { code: 'a; b;', errors: [{ message: 'ids: 2' }] },
      { code: 'c;', errors: [{ message: 'ids: 1' }] },
      { code: 'c;', options: [{ label: 'L' }], errors: [{ message: 'L: 1' }] },
    ],
  });

  oxlint.run('ordered', ordered as never, {
    valid: [],
    invalid: [{ code: 'a;', errors: [{ message: 'after saw exit=true' }] }],
  });

  oxlint.run('after-only', afterOnly as never, {
    valid: [],
    invalid: [{ code: 'a;', errors: [{ message: 'done' }] }],
  });
});

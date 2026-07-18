/**
 * Dual-layer coverage-completion tests.
 *
 * Layer 1: RuleTester fixtures through the real parser for branches that are
 * reachable from source text (parent-type matrices, option combinations,
 * autofix outputs).
 *
 * Layer 2: direct unit tests — extracted helpers called as plain functions,
 * and `rule.create(mockContext)` listeners invoked with synthetic AST objects
 * for parser-unreachable branches (uses `createWithMockContext` from
 * `@interlace/eslint-devkit`).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll, vi } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';

import { consistentExistenceIndexCheck } from '../../rules/conventions/consistent-existence-index-check';
import {
  expiringTodoComments,
  parseVersionParts,
  compareVersions,
  checkDateCondition,
  checkPackageVersionCondition,
  checkEngineVersionCondition,
  checkDependencyCondition,
  parseTodoCondition,
  validateCondition,
  checkParsedCondition,
} from '../../rules/conventions/expiring-todo-comments';
import { filenameCase } from '../../rules/conventions/filename-case';
import { noCommentedCode } from '../../rules/conventions/no-commented-code';
import { noConsoleSpaces } from '../../rules/conventions/no-console-spaces';
import { noJsonSchemaTags } from '../../rules/conventions/no-json-schema-tags';
import { noMagicNumbers } from '../../rules/conventions/no-magic-numbers';
import { noRawCrossPropertyHref } from '../../rules/conventions/no-raw-cross-property-href';
import { preferCodePoint } from '../../rules/conventions/prefer-code-point';
import { preferDependencyVersionStrategy } from '../../rules/conventions/prefer-dependency-version-strategy';
import { preferDomNodeTextContent } from '../../rules/conventions/prefer-dom-node-text-content';
import { requireDataTestId } from '../../rules/conventions/require-data-testid';
import { utmTaxonomy } from '../../rules/conventions/utm-taxonomy';
import { analyticsEventNaming } from '../../rules/conventions/analytics-event-naming';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const jsxRuleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

type Listener = (node: unknown) => void;
type AnyReport = {
  messageId: string;
  data?: Record<string, string>;
  suggest?: {
    messageId: string;
    data?: Record<string, string>;
    fix: (fixer: unknown) => unknown;
  }[];
};

/* ------------------------------------------------------------------ */
/* consistent-existence-index-check                                    */
/* ------------------------------------------------------------------ */

describe('consistent-existence-index-check — standalone-parent matrix', () => {
  ruleTester.run(
    'standalone contexts get a fix',
    consistentExistenceIndexCheck,
    {
      valid: [],
      invalid: [
        {
          code: 'const has = obj.hasOwnProperty("k");',
          errors: [{ messageId: 'consistentExistenceCheck' }],
          output: 'const has = "k" in obj;',
        },
        {
          code: 'x = obj.hasOwnProperty("k");',
          errors: [{ messageId: 'consistentExistenceCheck' }],
          output: 'x = "k" in obj;',
        },
        {
          code: 'function f() { return obj.hasOwnProperty("k"); }',
          errors: [{ messageId: 'consistentExistenceCheck' }],
          output: 'function f() { return "k" in obj; }',
        },
        {
          code: 'const g = () => obj.hasOwnProperty("k");',
          errors: [{ messageId: 'consistentExistenceCheck' }],
          output: 'const g = () => "k" in obj;',
        },
        {
          code: 'if (obj.hasOwnProperty("k")) {}',
          errors: [{ messageId: 'consistentExistenceCheck' }],
          output: 'if ("k" in obj) {}',
        },
        {
          code: 'while (obj.hasOwnProperty("k")) {}',
          errors: [{ messageId: 'consistentExistenceCheck' }],
          output: 'while ("k" in obj) {}',
        },
        {
          code: 'do {} while (obj.hasOwnProperty("k"));',
          errors: [{ messageId: 'consistentExistenceCheck' }],
          output: 'do {} while ("k" in obj);',
        },
        {
          code: 'for (; obj.hasOwnProperty("k"); ) {}',
          errors: [{ messageId: 'consistentExistenceCheck' }],
          output: 'for (; "k" in obj; ) {}',
        },
        {
          code: 'const t = obj.hasOwnProperty("k") ? 1 : 2;',
          errors: [{ messageId: 'consistentExistenceCheck' }],
          output: 'const t = "k" in obj ? 1 : 2;',
        },
        // Not a standalone expression (unary operand) — reported, but no fix.
        {
          code: 'const n = !obj.hasOwnProperty("k");',
          errors: [{ messageId: 'consistentExistenceCheck' }],
          output: null,
        },
        // Object.prototype.hasOwnProperty.call(obj, prop)
        {
          code: 'Object.prototype.hasOwnProperty.call(obj, "k");',
          errors: [{ messageId: 'consistentExistenceCheck' }],
          output: '"k" in obj;',
        },
      ],
    },
  );
});

/* ------------------------------------------------------------------ */
/* expiring-todo-comments — Layer 2 unit tests of extracted helpers    */
/* ------------------------------------------------------------------ */

describe('expiring-todo-comments — extracted helpers', () => {
  describe('parseVersionParts', () => {
    it('parses plain and prefixed semver', () => {
      expect(parseVersionParts('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
      expect(parseVersionParts('^4.5.6')).toEqual({ major: 4, minor: 5, patch: 6 });
      expect(parseVersionParts('>=7.8.9')).toEqual({ major: 7, minor: 8, patch: 9 });
    });

    it('normalizes wildcards and short versions to zeros', () => {
      expect(parseVersionParts('24.x')).toEqual({ major: 24, minor: 0, patch: 0 });
      expect(parseVersionParts('18')).toEqual({ major: 18, minor: 0, patch: 0 });
      expect(parseVersionParts('not-a-version')).toEqual({ major: 0, minor: 0, patch: 0 });
    });
  });

  describe('compareVersions', () => {
    it('compares major, minor, and patch positions', () => {
      expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
      expect(compareVersions('1.3.0', '1.2.9')).toBeGreaterThan(0);
      expect(compareVersions('1.2.4', '1.2.5')).toBeLessThan(0);
      expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
    });

    it('treats wildcard segments as zero', () => {
      expect(compareVersions('24.x', '24.0.0')).toBe(0);
      expect(compareVersions('24.x', '16.0.0')).toBeGreaterThan(0);
    });
  });

  describe('checkDateCondition', () => {
    it('is true for past dates and false for future dates', () => {
      expect(checkDateCondition('2000-01-01')).toBe(true);
      expect(checkDateCondition('2999-12-31')).toBe(false);
    });

    it('is false for garbage input (Invalid Date compares false)', () => {
      expect(checkDateCondition('garbage')).toBe(false);
    });
  });

  describe('checkPackageVersionCondition', () => {
    const pkg = { version: '2.0.0' };

    it('returns false without a package or version', () => {
      expect(checkPackageVersionCondition(null, '>=', '1.0.0')).toBe(false);
      expect(checkPackageVersionCondition({}, '>=', '1.0.0')).toBe(false);
    });

    it('evaluates every operator', () => {
      expect(checkPackageVersionCondition(pkg, '>', '1.0.0')).toBe(true);
      expect(checkPackageVersionCondition(pkg, '>', '2.0.0')).toBe(false);
      expect(checkPackageVersionCondition(pkg, '>=', '2.0.0')).toBe(true);
      expect(checkPackageVersionCondition(pkg, '<', '3.0.0')).toBe(true);
      expect(checkPackageVersionCondition(pkg, '<', '1.0.0')).toBe(false);
      expect(checkPackageVersionCondition(pkg, '<=', '2.0.0')).toBe(true);
      expect(checkPackageVersionCondition(pkg, '=', '2.0.0')).toBe(true);
      expect(checkPackageVersionCondition(pkg, '==', '2.0.0')).toBe(true);
      expect(checkPackageVersionCondition(pkg, '==', '2.0.1')).toBe(false);
    });

    it('returns false for an unknown operator', () => {
      expect(checkPackageVersionCondition(pkg, '!', '1.0.0')).toBe(false);
    });
  });

  describe('checkEngineVersionCondition', () => {
    const pkg = { engines: { node: '>=18.0.0' } };

    it('only supports the node engine', () => {
      expect(checkEngineVersionCondition(pkg, 'npm', '>=', '9.0.0')).toBe(false);
    });

    it('returns false without engines.node', () => {
      expect(checkEngineVersionCondition(null, 'node', '>=', '16.0.0')).toBe(false);
      expect(checkEngineVersionCondition({}, 'node', '>=', '16.0.0')).toBe(false);
      expect(
        checkEngineVersionCondition({ engines: {} }, 'node', '>=', '16.0.0'),
      ).toBe(false);
    });

    it('evaluates every operator against the normalized engine version', () => {
      expect(checkEngineVersionCondition(pkg, 'node', '>=', '16.0.0')).toBe(true);
      expect(checkEngineVersionCondition(pkg, 'node', '>', '18.0.0')).toBe(false);
      expect(checkEngineVersionCondition(pkg, 'node', '>', '16.0.0')).toBe(true);
      expect(checkEngineVersionCondition(pkg, 'node', '<', '20.0.0')).toBe(true);
      expect(checkEngineVersionCondition(pkg, 'node', '<=', '18.0.0')).toBe(true);
      // '=' is not a supported engine operator — falls to the default arm.
      expect(checkEngineVersionCondition(pkg, 'node', '=', '18.0.0')).toBe(false);
    });

    it('normalizes wildcard engine versions', () => {
      expect(
        checkEngineVersionCondition(
          { engines: { node: '24.x' } },
          'node',
          '>=',
          '16.0.0',
        ),
      ).toBe(true);
    });
  });

  describe('checkDependencyCondition', () => {
    const pkg = {
      dependencies: { lodash: '^4.0.0' },
      devDependencies: { vitest: '^1.0.0' },
      peerDependencies: { eslint: '^9.0.0' },
    };

    it('returns false without a package.json', () => {
      expect(checkDependencyCondition(null, 'lodash', true)).toBe(false);
    });

    it('finds packages in any dependency group', () => {
      expect(checkDependencyCondition(pkg, 'lodash', true)).toBe(true);
      expect(checkDependencyCondition(pkg, 'vitest', true)).toBe(true);
      expect(checkDependencyCondition(pkg, 'eslint', true)).toBe(true);
      expect(checkDependencyCondition(pkg, 'missing', true)).toBe(false);
    });

    it('documents current behavior: `-pkg` also reports presence', () => {
      // Both branches of the ternary return `hasPackage` today.
      expect(checkDependencyCondition(pkg, 'lodash', false)).toBe(true);
      expect(checkDependencyCondition(pkg, 'missing', false)).toBe(false);
    });
  });

  describe('parseTodoCondition', () => {
    it('parses term, condition, and message', () => {
      expect(parseTodoCondition(' TODO [2099-12-31]: do it', 'TODO')).toEqual({
        conditions: ['2099-12-31'],
        rest: 'do it',
      });
    });

    it('parses author annotations and block-comment star prefixes', () => {
      expect(
        parseTodoCondition(' TODO (@ofri) [>=1.0.0]: with author', 'TODO'),
      ).toEqual({ conditions: ['>=1.0.0'], rest: 'with author' });
      expect(
        parseTodoCondition('* TODO [2099-12-31]: in block', 'TODO'),
      ).toEqual({ conditions: ['2099-12-31'], rest: 'in block' });
    });

    it('splits multiple comma-separated conditions', () => {
      expect(
        parseTodoCondition(' TODO [2099-12-31, >=1.0.0]: multi', 'TODO'),
      ).toEqual({ conditions: ['2099-12-31', '>=1.0.0'], rest: 'multi' });
    });

    it('returns null when there is no bracketed condition', () => {
      expect(parseTodoCondition(' TODO no brackets here', 'TODO')).toBeNull();
      expect(parseTodoCondition(' FIXME [x]: wrong term', 'TODO')).toBeNull();
    });
  });

  describe('validateCondition', () => {
    it('recognizes every condition type', () => {
      expect(validateCondition('2099-12-31')).toEqual({
        type: 'date',
        value: '2099-12-31',
      });
      expect(validateCondition('>=1.0.0')).toEqual({
        type: 'package-version',
        operator: '>=',
        value: '1.0.0',
      });
      expect(validateCondition('==2.0.0')).toEqual({
        type: 'package-version',
        operator: '==',
        value: '2.0.0',
      });
      expect(validateCondition('engine:node@>=16.0.0')).toEqual({
        type: 'engine-version',
        operator: '>=',
        value: 'node@16.0.0',
      });
      expect(validateCondition('+lodash')).toEqual({
        type: 'dependency',
        operator: '+',
        value: 'lodash',
      });
      expect(validateCondition('-lodash')).toEqual({
        type: 'dependency',
        operator: '-',
        value: 'lodash',
      });
    });

    it('rejects unknown engines and garbage conditions', () => {
      expect(validateCondition('engine:deno@>=1.0.0')).toBeNull();
      expect(validateCondition('not~a~condition')).toBeNull();
    });
  });

  describe('checkParsedCondition', () => {
    const pkg = {
      version: '2.0.0',
      engines: { node: '>=18.0.0' },
      dependencies: { lodash: '^4.0.0' },
    };
    const getPkg = () => pkg;

    it('returns false for null and unknown condition types', () => {
      expect(checkParsedCondition(getPkg, null)).toBe(false);
      expect(
        checkParsedCondition(getPkg, { type: 'mystery', value: 'x' }),
      ).toBe(false);
    });

    it('never reads package.json for date conditions', () => {
      const spy = vi.fn(() => pkg);
      expect(
        checkParsedCondition(spy, { type: 'date', value: '2000-01-01' }),
      ).toBe(true);
      expect(spy).not.toHaveBeenCalled();
    });

    it('evaluates package-version, engine-version, and dependency conditions', () => {
      expect(
        checkParsedCondition(getPkg, {
          type: 'package-version',
          operator: '>=',
          value: '1.0.0',
        }),
      ).toBe(true);
      expect(
        checkParsedCondition(getPkg, {
          type: 'engine-version',
          operator: '>=',
          value: 'node@16.0.0',
        }),
      ).toBe(true);
      expect(
        checkParsedCondition(getPkg, {
          type: 'dependency',
          operator: '+',
          value: 'lodash',
        }),
      ).toBe(true);
    });

    it('returns false when the operator is missing', () => {
      const spy = vi.fn(() => pkg);
      expect(
        checkParsedCondition(spy, { type: 'package-version', value: '1.0.0' }),
      ).toBe(false);
      expect(
        checkParsedCondition(spy, {
          type: 'engine-version',
          value: 'node@16.0.0',
        }),
      ).toBe(false);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('rule wiring', () => {
    ruleTester.run('condition handling through the rule', expiringTodoComments, {
      valid: [
        // Package version not reached yet — no report.
        { code: '// TODO [<0.0.1]: wait for the rewrite' },
      ],
      invalid: [
        // Unparseable condition → invalidTodoCondition.
        {
          code: '// TODO [not~a~condition]: fix me',
          errors: [{ messageId: 'invalidTodoCondition' }],
        },
        // Two satisfied package-version conditions in one file: the second
        // check hits the loadPackageJson cache.
        {
          code: '// TODO [>=0.0.1]: first\n// FIXME [>=0.0.1]: second',
          errors: [
            { messageId: 'expiringTodoComment' },
            { messageId: 'expiringTodoComment' },
          ],
        },
      ],
    });

    it('ignores comment nodes that are neither Line nor Block', () => {
      const { listeners, reports, context } = createWithMockContext(
        expiringTodoComments,
      );
      Object.assign(context.sourceCode, {
        getAllComments: () => [
          {
            type: 'Shebang',
            value: '!/usr/bin/env node TODO [2000-01-01]: expired',
            loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          },
        ],
      });
      (listeners['Program'] as Listener)({ type: 'Program' });
      expect(reports).toEqual([]);
    });
  });
});

/* ------------------------------------------------------------------ */
/* filename-case                                                       */
/* ------------------------------------------------------------------ */

describe('filename-case — ignore patterns and unknown case', () => {
  ruleTester.run('non-matching ignore entries still report', filenameCase, {
    valid: [],
    invalid: [
      {
        // String mismatch, non-string/non-RegExp entry, and RegExp mismatch
        // all fall through to the report.
        code: 'const x = 1;',
        filename: 'BadName.ts',
        options: [{ ignore: ['other.ts', {}, /^nope$/] }],
        errors: [
          {
            messageId: 'filenameCase',
            data: {
              case: 'kebabCase',
              current: 'BadName.ts',
              suggested: 'bad-name.ts',
            },
          },
        ],
      },
    ],
  });

  it('treats an unknown case option as always matching (no report)', () => {
    const { listeners, reports } = createWithMockContext(filenameCase, {
      options: [{ case: 'not-a-real-case' }],
      filename: 'someFile.ts',
    });
    (listeners['Program'] as Listener)({ type: 'Program' });
    expect(reports).toEqual([]);
  });

  it('bails out when there is no filename', () => {
    const { listeners, reports } = createWithMockContext(filenameCase, {
      filename: '',
    });
    (listeners['Program'] as Listener)({ type: 'Program' });
    expect(reports).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* no-commented-code                                                   */
/* ------------------------------------------------------------------ */

describe('no-commented-code — grouping and defensive branches', () => {
  ruleTester.run('group flush and minLines gating', noCommentedCode, {
    valid: [
      // Two code comments grouped, but below minLines → no report.
      {
        code: '// const a = 1;\n// const b = 2;\nconst real = 3;',
        options: [{ minLines: 3 }],
      },
      // Completely empty comment — value is '' during grouping.
      { code: '//\nconst a = 1;' },
    ],
    invalid: [
      // A prose comment between code comments flushes the current group,
      // producing two independent single-comment reports.
      {
        code: '// const a = 1;\n// some plain prose here\n// const b = 2;\nconst real = 3;',
        errors: [
          { messageId: 'commentedCode', data: { lines: '1' }, suggestions: 1 },
          { messageId: 'commentedCode', data: { lines: '1' }, suggestions: 1 },
        ],
      },
    ],
  });

  /** A comment whose `value` getter yields a different string per read. */
  function seqComment(values: string[], range: [number, number]) {
    let reads = 0;
    return {
      type: 'Line',
      range,
      loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 20 } },
      get value(): string {
        const v = values[Math.min(reads, values.length - 1)];
        reads++;
        if (v === '__THROW__') throw new Error('synthetic value failure');
        return v;
      },
    };
  }

  function runProgram(comments: unknown[], options?: readonly unknown[]) {
    const { listeners, reports, context } = createWithMockContext(
      noCommentedCode,
      options ? { options } : {},
    );
    Object.assign(context.sourceCode, { getAllComments: () => comments });
    (listeners['Program'] as Listener)({ type: 'Program' });
    return reports as unknown as AnyReport[];
  }

  it('skips a comment whose value becomes empty by check time', () => {
    // 1st read (grouping) looks like code; 2nd read (checkComment) is empty,
    // so countCommentLines sees 0 lines and the comment is skipped.
    const reports = runProgram([seqComment(['const x = 1;', ''], [0, 12])]);
    expect(reports).toEqual([]);
  });

  it('skips a comment that stops looking like code by check time', () => {
    const reports = runProgram([
      seqComment(['const x = 1;', 'plain words'], [0, 12]),
    ]);
    expect(reports).toEqual([]);
  });

  it('silently skips a comment whose value read throws mid-check', () => {
    const reports = runProgram([
      seqComment(['const x = 1;', '__THROW__'], [0, 12]),
    ]);
    expect(reports).toEqual([]);
  });

  it('suggestion fix returns null when the fixer throws (single comment)', () => {
    const reports = runProgram([seqComment(['const x = 1;'], [0, 12])]);
    expect(reports).toHaveLength(1);
    expect(reports[0].messageId).toBe('commentedCode');
    const [removeCode, useVcs] = reports[0].suggest ?? [];
    expect(
      removeCode.fix({
        remove: () => {
          throw new Error('fixer exploded');
        },
      }),
    ).toBeNull();
    expect(useVcs.fix({})).toBeNull();
  });

  it('group report: empty second read shrinks totals; throwing fixer yields null', () => {
    const reports = runProgram([
      seqComment(['const a = 1;', ''], [0, 14]),
      seqComment(['const b = 2;'], [15, 29]),
    ]);
    // First comment counts 0 lines on the reduce pass, second counts 1.
    expect(reports).toHaveLength(1);
    expect(reports[0].messageId).toBe('commentedCode');
    expect(reports[0].data?.['lines']).toBe('1');
    const [removeCode] = reports[0].suggest ?? [];
    expect(
      removeCode.fix({
        removeRange: () => {
          throw new Error('fixer exploded');
        },
      }),
    ).toBeNull();
  });

  it('tolerates a null options element (raw context options)', () => {
    const reports = runProgram([], [null]);
    expect(reports).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* no-console-spaces                                                   */
/* ------------------------------------------------------------------ */

describe('no-console-spaces — template quasis and method-name fallback', () => {
  ruleTester.run('template literal quasi scanning', noConsoleSpaces, {
    valid: [
      // No leading/trailing spaces in any quasi.
      { code: 'console.log(`a${x}b`);' },
    ],
    invalid: [
      // First quasi is clean (loop continues), second has spaces.
      {
        code: 'console.log(`a${x} b `);',
        errors: [{ messageId: 'noConsoleSpaces' }],
        output: null,
      },
    ],
  });

  it('falls back to "console" when the callee shape changes between reads', () => {
    const { listeners, reports } = createWithMockContext(noConsoleSpaces);
    let typeReads = 0;
    const node = {
      callee: {
        get type(): string {
          typeReads++;
          // Read 1 (isConsoleMethodCall): a console member call.
          // Read 2 (getConsoleMethodName): no longer a MemberExpression.
          return typeReads === 1 ? 'MemberExpression' : 'CallExpression';
        },
        object: { type: 'Identifier', name: 'console' },
        property: { type: 'Identifier', name: 'log' },
      },
      arguments: [{ type: 'Literal', value: ' padded ' }],
    };
    (listeners['CallExpression'] as Listener)(node);
    const typed = reports as unknown as AnyReport[];
    expect(typed).toHaveLength(1);
    expect(typed[0].messageId).toBe('noConsoleSpaces');
    expect(typed[0].data?.['method']).toBe('console');
  });
});

/* ------------------------------------------------------------------ */
/* no-json-schema-tags                                                 */
/* ------------------------------------------------------------------ */

describe('no-json-schema-tags — tag on the last line without trailing newline', () => {
  ruleTester.run('EOF line removal', noJsonSchemaTags, {
    valid: [],
    invalid: [
      {
        code: 'const x = 1;\n/** x @minimum 1 */',
        errors: [
          {
            messageId: 'jsonSchemaTag',
            suggestions: [
              {
                messageId: 'moveToDescription',
                output: 'const x = 1;\n',
              },
            ],
          },
        ],
      },
    ],
  });
});

/* ------------------------------------------------------------------ */
/* no-magic-numbers                                                    */
/* ------------------------------------------------------------------ */

describe('no-magic-numbers — option branches and synthetic contexts', () => {
  ruleTester.run('non-finite and enum literals', noMagicNumbers, {
    valid: [
      // 1e999 parses to Infinity — not flagged.
      { code: 'foo(1e999);' },
      // Enum members are ignored by default.
      { code: 'enum Flag { Seven = 7 }' },
    ],
    invalid: [],
  });

  function runLiteral(
    value: number,
    parent: Record<string, unknown> | null,
    options?: readonly unknown[],
  ) {
    const result = createWithMockContext(
      noMagicNumbers,
      options ? { options } : {},
    );
    const node: Record<string, unknown> = { type: 'Literal', value };
    if (parent) {
      node['parent'] = parent;
      if (parent['__linkChild']) parent['right'] = node;
    }
    (result.listeners['Literal'] as Listener)(node);
    return { ...result, node, typedReports: result.reports as unknown as AnyReport[] };
  }

  const strictOptions = [
    {
      ignoreDefaultValues: false,
      ignoreEnums: false,
      ignoreBitwiseExpressions: true,
    },
  ];

  it('flags default parameter values when ignoreDefaultValues is false', () => {
    const { typedReports } = runLiteral(
      42,
      { type: 'AssignmentPattern', __linkChild: true },
      strictOptions,
    );
    expect(typedReports).toHaveLength(1);
    expect(typedReports[0].messageId).toBe('noMagicNumber');
    expect(typedReports[0].data?.['value']).toBe('42');
  });

  it('flags enum members when ignoreEnums is false', () => {
    const { typedReports } = runLiteral(42, { type: 'TSEnumMember' }, strictOptions);
    expect(typedReports).toHaveLength(1);
    expect(typedReports[0].messageId).toBe('noMagicNumber');
  });

  it('skips literals inside bitwise expressions when ignoreBitwiseExpressions is true', () => {
    const { typedReports } = runLiteral(
      42,
      { type: 'BinaryExpression', operator: '&' },
      strictOptions,
    );
    expect(typedReports).toEqual([]);
  });

  it('still flags non-bitwise parents when ignoreBitwiseExpressions is true', () => {
    expect(
      runLiteral(42, { type: 'CallExpression' }, strictOptions).typedReports,
    ).toHaveLength(1);
    expect(
      runLiteral(
        42,
        { type: 'BinaryExpression', operator: '+' },
        strictOptions,
      ).typedReports,
    ).toHaveLength(1);
  });

  it('skips literals under an ExportNamedDeclaration ancestry walk', () => {
    const { typedReports } = runLiteral(42, {
      type: 'VariableDeclaration',
      parent: { type: 'ExportNamedDeclaration' },
    });
    // Synthetic node types itself as a declarator so the export walk runs.
    const rerun = createWithMockContext(noMagicNumbers);
    const node = {
      type: 'VariableDeclarator',
      value: 42,
      parent: {
        type: 'VariableDeclaration',
        parent: { type: 'ExportNamedDeclaration' },
      },
    };
    (rerun.listeners['Literal'] as Listener)(node);
    expect(rerun.reports).toEqual([]);
    // The plain-literal variant is still flagged (walk breaks at the Literal).
    expect(typedReports).toHaveLength(1);
  });

  it('names negative constants MAGIC_NEG_<n>', () => {
    const { typedReports } = runLiteral(-5, { type: 'ExpressionStatement' });
    expect(typedReports).toHaveLength(1);
    expect(typedReports[0].suggest?.[0].data?.['constName']).toBe('MAGIC_NEG_5');
  });

  it('suggestion fix bails out without a statement ancestor', () => {
    const { typedReports } = runLiteral(99, { type: 'MysteryNode' });
    expect(typedReports).toHaveLength(1);
    const fix = typedReports[0].suggest?.[0].fix;
    expect(fix?.({})).toBeNull();
  });

  it('suggestion fix bails out when the statement has no first token', () => {
    const result = createWithMockContext(noMagicNumbers);
    Object.assign(result.context.sourceCode, { getFirstToken: () => null });
    const node = {
      type: 'Literal',
      value: 77,
      parent: { type: 'ExpressionStatement' },
    };
    (result.listeners['Literal'] as Listener)(node);
    const typed = result.reports as unknown as AnyReport[];
    expect(typed).toHaveLength(1);
    expect(typed[0].suggest?.[0].fix({})).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* no-raw-cross-property-href                                          */
/* ------------------------------------------------------------------ */

describe('no-raw-cross-property-href — unparseable URL', () => {
  jsxRuleTester.run('URL constructor failure is ignored', noRawCrossPropertyHref, {
    valid: [
      // Passes the protocol regex but throws in `new URL(...)`.
      { code: '<a href="http://">broken</a>;' },
    ],
    invalid: [],
  });
});

/* ------------------------------------------------------------------ */
/* prefer-code-point                                                   */
/* ------------------------------------------------------------------ */

describe('prefer-code-point — ignore rules and callee shapes', () => {
  ruleTester.run('computed identifier access is ignored', preferCodePoint, {
    valid: [
      // obj[charCodeAt] — computed access through a variable named
      // charCodeAt is deliberately ignored.
      { code: 'const c = str[charCodeAt](0);' },
      // Plain function call — not a member expression at all.
      { code: 'codePointAtFn(0);' },
    ],
    invalid: [],
  });

  it('still reports when the callee stops being a MemberExpression between reads', () => {
    const { listeners, reports } = createWithMockContext(preferCodePoint);
    let typeReads = 0;
    const node = {
      callee: {
        get type(): string {
          typeReads++;
          // Read 1 (isCharCodeAtCall): MemberExpression → charCodeAt found.
          // Read 2 (shouldIgnoreCall): not a MemberExpression → not ignored.
          return typeReads === 1 ? 'MemberExpression' : 'Identifier';
        },
        property: { type: 'Identifier', name: 'charCodeAt' },
        computed: false,
        optional: false,
      },
      arguments: [],
    };
    (listeners['CallExpression'] as Listener)(node);
    const typed = reports as unknown as AnyReport[];
    expect(typed).toHaveLength(1);
    expect(typed[0].messageId).toBe('preferCodePoint');
  });
});

/* ------------------------------------------------------------------ */
/* prefer-dependency-version-strategy                                  */
/* ------------------------------------------------------------------ */

describe('prefer-dependency-version-strategy — protocols, overrides, key shapes', () => {
  ruleTester.run('skipped specifiers and overrides', preferDependencyVersionStrategy, {
    valid: [
      // file:/link: protocols and non-semver specifiers are skipped.
      {
        code: 'const deps = { "a": "^1.0.0", "b": "file:../pkg", "c": "link:../pkg2", "d": "latest" };',
      },
      // Per-package override to "any" skips that package.
      {
        code: 'const deps = { "a": "^1.0.0", "b": "1.9.9" };',
        options: [{ overrides: { b: 'any' } }],
      },
      // Spread elements are skipped by the property scan.
      { code: 'const deps = { "a": "^1.0.0", ...extra };' },
      // Computed keys yield no dependency name.
      { code: 'const deps = { "a": "^1.0.0", [k + "x"]: "2.0.0" };' },
      // "dependencies" property whose value is not an object is ignored.
      { code: 'const pkg = { "dependencies": "latest" };' },
    ],
    invalid: [
      // Identifier keys are read via key.name.
      {
        code: 'const deps = { react: "18.0.0" };',
        errors: [{ messageId: 'preferStrategy' }],
        output: 'const deps = { react: "^18.0.0" };',
      },
      // String-keyed "dependencies" fires the dedicated selector listener
      // (and the generic ObjectExpression listener → two identical reports).
      {
        code: 'const pkg = { "dependencies": { "react": "18.2.0" } };',
        errors: [
          { messageId: 'preferStrategy' },
          { messageId: 'preferStrategy' },
        ],
        output: 'const pkg = { "dependencies": { "react": "^18.2.0" } };',
      },
    ],
  });

  it('reports an invalid strategy and disables itself (mock context)', () => {
    const { listeners, reports } = createWithMockContext(
      preferDependencyVersionStrategy,
      { options: [{ strategy: 'bogus' }] },
    );
    expect(listeners).toEqual({});
    const typed = reports as unknown as AnyReport[];
    expect(typed).toHaveLength(1);
    expect(typed[0].messageId).toBe('invalidStrategy');
    expect(typed[0].data?.['strategy']).toBe('bogus');
  });

  it('defaults to caret strategy when no options are provided', () => {
    const { listeners, reports } = createWithMockContext(
      preferDependencyVersionStrategy,
      { options: [] },
    );
    (listeners['ObjectExpression'] as Listener)({ properties: [] });
    expect(reports).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* prefer-dom-node-text-content                                        */
/* ------------------------------------------------------------------ */

describe('prefer-dom-node-text-content — heuristics and fix fallback', () => {
  ruleTester.run('DOM-likeness heuristics', preferDomNodeTextContent, {
    valid: [
      // Method call that is not a DOM query.
      { code: 'const a = foo.bar().innerText;' },
      // Property access that is not a known DOM property.
      { code: 'const b = a.b.innerText;' },
    ],
    invalid: [
      // Identifier with a DOM-ish suffix.
      {
        code: 'const t = myElement.innerText;',
        errors: [
          {
            messageId: 'preferDomNodeTextContent',
            suggestions: [
              {
                messageId: 'preferDomNodeTextContent',
                output: 'const t = myElement.textContent;',
              },
            ],
          },
        ],
      },
    ],
  });

  it('suggestion fix returns null when the property mutates before fixing', () => {
    const { listeners, reports } = createWithMockContext(
      preferDomNodeTextContent,
    );
    const node: Record<string, unknown> = {
      object: { type: 'Identifier', name: 'el' },
      property: { type: 'Identifier', name: 'innerText' },
      computed: false,
    };
    (listeners['MemberExpression'] as Listener)(node);
    const typed = reports as unknown as AnyReport[];
    expect(typed).toHaveLength(1);
    const fix = typed[0].suggest?.[0].fix;
    node['property'] = { type: 'PrivateIdentifier' };
    expect(fix?.({})).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* require-data-testid                                                 */
/* ------------------------------------------------------------------ */

describe('require-data-testid — attribute shapes and name resolution', () => {
  jsxRuleTester.run('spreads, namespaces, and member names', requireDataTestId, {
    valid: [
      // Spread on an interactive anchor: parent owns the testid.
      { code: '<a {...props} href="/x">y</a>;' },
      // Namespaced attribute name is skipped while scanning for href/onClick.
      { code: '<a foo:bar="v" data-testid="ok" href="/x">y</a>;' },
      // Spread on a handler component: parent owns the testid.
      { code: '<Comp {...rest} onClick={h}>x</Comp>;' },
      // Namespaced element names are not resolvable → skipped.
      { code: '<ns:widget attr="1" />;' },
      // Expression-container string literal is a stable value.
      { code: '<button data-testid={"lit"} onClick={h} />;' },
      // Empty componentPattern disables custom-component checks.
      { code: '<Widget onClick={h} />;', options: [{ componentPattern: '' }] },
    ],
    invalid: [
      // Member-expression component name resolves to its property.
      {
        code: '<Card.Header onClick={h} />;',
        errors: [{ messageId: 'missingDataTestId' }],
      },
      // Namespaced attr is skipped by the handler scan; onClick still counts.
      {
        code: '<Comp ns:x="1" onClick={h} />;',
        errors: [{ messageId: 'missingDataTestId' }],
      },
      // Boolean-shorthand data-testid has no stable value.
      {
        code: '<button data-testid />;',
        errors: [{ messageId: 'dynamicDataTestId' }],
      },
    ],
  });

  it('applies option fallbacks when the options element is null', () => {
    const { listeners, reports } = createWithMockContext(requireDataTestId, {
      options: [null],
    });
    const node = {
      name: { type: 'JSXIdentifier', name: 'button' },
      attributes: [],
    };
    (listeners['JSXOpeningElement'] as Listener)(node);
    const typed = reports as unknown as AnyReport[];
    expect(typed).toHaveLength(1);
    expect(typed[0].messageId).toBe('missingDataTestId');
  });

  it('skips member-expression names whose property is not a JSXIdentifier', () => {
    const { listeners, reports } = createWithMockContext(requireDataTestId);
    (listeners['JSXOpeningElement'] as Listener)({
      name: {
        type: 'JSXMemberExpression',
        property: { type: 'JSXNamespacedName' },
      },
      attributes: [],
    });
    expect(reports).toEqual([]);
  });

  it('skips unknown attribute node types while looking for data-testid', () => {
    const { listeners, reports } = createWithMockContext(requireDataTestId);
    (listeners['JSXOpeningElement'] as Listener)({
      name: { type: 'JSXIdentifier', name: 'button' },
      // Neither a JSXAttribute nor a JSXSpreadAttribute — the data-testid
      // scan must skip it and report the attribute as missing.
      attributes: [{ type: 'MysteryAttribute' }],
    });
    const typed = reports as unknown as AnyReport[];
    expect(typed).toHaveLength(1);
    expect(typed[0].messageId).toBe('missingDataTestId');
  });

  it('treats a non-literal, non-container attribute value as unstable', () => {
    const { listeners, reports } = createWithMockContext(requireDataTestId);
    (listeners['JSXOpeningElement'] as Listener)({
      name: { type: 'JSXIdentifier', name: 'button' },
      attributes: [
        {
          type: 'JSXAttribute',
          name: { type: 'JSXIdentifier', name: 'data-testid' },
          value: { type: 'JSXElement' },
        },
      ],
    });
    const typed = reports as unknown as AnyReport[];
    expect(typed).toHaveLength(1);
    expect(typed[0].messageId).toBe('dynamicDataTestId');
  });
});

/* ------------------------------------------------------------------ */
/* utm-taxonomy & analytics-event-naming                               */
/* ------------------------------------------------------------------ */

describe('utm-taxonomy — quasis without utm params', () => {
  ruleTester.run('mixed template quasis', utmTaxonomy, {
    valid: [
      // First quasi carries valid UTM params; second has none.
      {
        code: 'const u = `https://ofriperetz.dev/?utm_source=github&utm_medium=blog${q}rest`;',
      },
    ],
    invalid: [],
  });
});

describe('analytics-event-naming — non-literal event names', () => {
  ruleTester.run('identifier arguments are not checked', analyticsEventNaming, {
    valid: [{ code: 'posthog.capture(dynamicName);' }],
    invalid: [],
  });
});

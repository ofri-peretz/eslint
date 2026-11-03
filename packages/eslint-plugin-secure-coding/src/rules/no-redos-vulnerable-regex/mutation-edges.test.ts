/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * The structural layer — the linear corrections, the relaxation pass and the
 * alternation check — is judged with the `recheck` oracle stubbed to CONFIRM
 * everything, so a mutant that makes the structural layer report cannot hide
 * behind an oracle veto. Message shape and option handling use the real setup.
 */
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { afterEach, describe, expect, it } from 'vitest';
import { noRedosVulnerableRegex } from './index';
import {
  __setOracleForTests,
  resetOracleForTests,
} from '../../utils/redos-oracle';

const linter = new Linter({ configType: 'flat' });
const messages = (
  code: string,
  options: Record<string, unknown> = {},
  filename = 'x.ts',
): string[] =>
  linter
    .verify(
      code,
      [
        {
          files: ['**/*.ts'],
          languageOptions: {
            parser: tsParser,
            ecmaVersion: 2022 as const,
            sourceType: 'module' as const,
          },
          plugins: { probe: { rules: { redos: noRedosVulnerableRegex } } },
          rules: { 'probe/redos': ['error', options] },
        },
      ],
      filename,
    )
    .filter((m) => m.ruleId)
    .map((m) => m.message);

const CONFIRMS = { checkSync: () => ({ status: 'vulnerable' as const }) };

describe('no-redos-vulnerable-regex — structural layer (oracle confirms all)', () => {
  afterEach(() => resetOracleForTests());
  const quiet: Array<[string, string]> = [
    [
      'complementary \\S/\\s in one quantified group are linear',
      '^\\s*(\\S+\\s*)+$',
    ],
    [
      'complementary \\w/\\W in one quantified group are linear',
      '^(\\w+\\W*)+$',
    ],
    [
      'complementary \\d/\\D in one quantified group are linear',
      '^(\\d+\\D*)+$',
    ],
    [
      'an optional step outside any loop is not relaxed',
      '^https:\\/\\/js\\.stripe\\.com\\/v3\\/?(\\?.*)?$',
    ],
    [
      'a flat sequence of bounded ranges is not relaxed',
      '^\\+?[0-9]{1,3}[- ]?[0-9]{3,10}$',
    ],
    ['a fixed-width {n} under + is not relaxed', '^(?:a{2})+$'],
    [
      'a range under a bounded quantifier is not relaxed',
      '^(?:[a-z]{2,4}){8}$',
    ],
    [
      'multi-character alternatives are not compared by their first character',
      '^(ab|ac)+$',
    ],
    [
      'an ambiguous alternation under a bounded quantifier is not the unbounded case',
      '^(a|a){8}$',
    ],
  ];
  for (const [name, pattern] of quiet) {
    it(name, () => {
      __setOracleForTests(CONFIRMS);
      expect(messages(`export default /${pattern}/;`)).toHaveLength(0);
    });
  }
  const reported: Array<[string, string]> = [
    ['an outer bound above five is not linear', '^(a+){1,8}$'],
    [
      'the first bounded group decides, not a later small one',
      '^(a+){1,10}(b+){1,3}$',
    ],
    [
      'complementary classes outside a quantified group prove nothing',
      '^\\S+\\s*(a+)+$',
    ],
    [
      'an overlapping pair after a disjoint branch is still found',
      '^(a|b|b)*$',
    ],
    [
      'FN: an overlapping pair beside a multi-character branch is catastrophic',
      '^(a|a|bc)*$',
    ],
  ];
  for (const [name, pattern] of reported) {
    it(name, () => {
      __setOracleForTests(CONFIRMS);
      expect(messages(`export default /${pattern}/;`)).toHaveLength(1);
    });
  }
  it('a pattern scslre reports keeps its scslre message even when its alternation is ambiguous', () => {
    __setOracleForTests(CONFIRMS);
    const [message] = messages('export default /^(a|a)+(b+)+$/;');
    expect(message).toContain('Self-loop quantifier (exponential');
  });
  it('the exponential report wins over an earlier polynomial one', () => {
    __setOracleForTests(CONFIRMS);
    const [message] = messages('export default /^a*a*(b+)+$/;');
    expect(message).toContain('Self-loop quantifier (exponential');
  });
});

describe('no-redos-vulnerable-regex — options and pattern sources', () => {
  afterEach(() => resetOracleForTests());
  it('without the oracle, an unknown degree retracts nothing', () => {
    resetOracleForTests(true);
    expect(
      messages('export default /^(a*).*b/;', {
        reportSecondDegreePolynomial: false,
      }),
    ).toHaveLength(1);
  });
  it('a literal longer than maxPatternLength is skipped', () => {
    expect(
      messages('export default /^(a+)+$/;', { maxPatternLength: 5 }),
    ).toHaveLength(0);
  });
  it('a literal exactly maxPatternLength long is analysed', () => {
    expect(
      messages('export default /^(a+)+$/;', { maxPatternLength: 7 }),
    ).toHaveLength(1);
  });
  it('a constructed pattern longer than maxPatternLength is skipped', () => {
    expect(
      messages("new RegExp('^(a+)+$');", { maxPatternLength: 5 }),
    ).toHaveLength(0);
  });
  it('a constructed pattern exactly maxPatternLength long is analysed', () => {
    expect(
      messages("new RegExp('^(a+)+$');", { maxPatternLength: 7 }),
    ).toHaveLength(1);
  });
  it('a test file is skipped', () => {
    expect(messages('export default /^(a+)+$/;', {}, 'x.test.ts')).toHaveLength(
      0,
    );
  });
  it('a string-literal source is exact, not runtime-built', () => {
    const [message] = messages("new RegExp('^(a+)+$');");
    expect(message).not.toContain('Runtime-built');
  });
  it('a concatenation of literals is exact', () => {
    const [message] = messages("new RegExp('^(a+' + ')+$');");
    expect(message).not.toContain('Runtime-built');
  });
  it('a concatenation with a runtime value is runtime-built', () => {
    const [message] = messages("new RegExp('^(a+)+' + suffix);");
    expect(message).toContain('Runtime-built');
  });
  it('an expression-free template is exact', () => {
    const [message] = messages('new RegExp(`^(a+)+$`);');
    expect(message).not.toContain('Runtime-built');
  });
  it('a raw method on another object is not String.raw', () => {
    expect(messages('new RegExp(Foo.raw`^(a+)+$`);')).toHaveLength(0);
  });
  it('another String method is not String.raw', () => {
    expect(messages('new RegExp(String.dedent`^(a+)+$`);')).toHaveLength(0);
  });
  it('a bare tag is not String.raw', () => {
    expect(messages('new RegExp(dedent`^(a+)+$`);')).toHaveLength(0);
  });
  it('a shadowed String is somebody else', () => {
    expect(
      messages(
        'function f(String) { return new RegExp(String.raw`^(a+)+$`); }',
      ),
    ).toHaveLength(0);
  });
  it('a binding written twice is not resolved', () => {
    expect(
      messages("let src = '^(a+)+$'; src = 'abc'; new RegExp(src);"),
    ).toHaveLength(0);
  });
  it('the flags argument reaches the parser', () => {
    expect(messages("new RegExp('^(\\\\p{L}+)+$', 'u');")).toHaveLength(1);
  });
  it('a null flags argument means no flags', () => {
    expect(messages("new RegExp('^(a+)+$', null);")).toHaveLength(1);
  });
});

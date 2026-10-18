/**
 * The test-path gate, rule by rule.
 *
 * Five rules exempt test files through an option (`allowInTests` /
 * `ignoreInTests`), each with its own default. Every gate is one line —
 * `if (isTestFile) return {}` or `if (isTestFile) return;` — and each rule's
 * own suite exercised it from only one side, so mutation testing found the
 * gate and its default free to flip (`if (false)`, `= true` → `= false`)
 * with nothing going red.
 *
 * What pins a gate is a snippet the rule REPORTS in a source file, linted
 * again under a test path: silent there exactly when the gate is open.
 * Both settings of the option are checked, so the default and the gate are
 * pinned independently.
 */
import parser from '@typescript-eslint/parser';
import { Linter, type Rule } from 'eslint';
import { describe, expect, it } from 'vitest';
import { noMathRandomCrypto } from './rules/no-math-random-crypto';
import { noSelfSignedCerts } from './rules/no-self-signed-certs';
import { noToctouVulnerability } from './rules/no-toctou-vulnerability';
import { noWeakHashAlgorithm } from './rules/no-weak-hash-algorithm';
import { requireStreamErrorHandler } from './rules/require-stream-error-handler';

interface Gate {
  rule: unknown;
  option: string;
  /** Is a test file exempt when the option is left at its default? */
  exemptByDefault: boolean;
  /** Reported in a source file. */
  code: string;
}

const GATES: Record<string, Gate> = {
  'no-math-random-crypto': {
    rule: noMathRandomCrypto,
    option: 'allowInTests',
    exemptByDefault: true,
    code: 'const token = Math.random().toString(36);',
  },
  'no-self-signed-certs': {
    rule: noSelfSignedCerts,
    option: 'allowInTests',
    exemptByDefault: false,
    code: 'https.request({ host, rejectUnauthorized: false });',
  },
  'no-toctou-vulnerability': {
    rule: noToctouVulnerability,
    option: 'ignoreInTests',
    exemptByDefault: true,
    code: 'if (fs.existsSync(p)) fs.unlinkSync(p);',
  },
  'no-weak-hash-algorithm': {
    rule: noWeakHashAlgorithm,
    option: 'allowInTests',
    exemptByDefault: false,
    code: "const passwordHash = crypto.createHash('md5').update(password).digest('hex');",
  },
  'require-stream-error-handler': {
    rule: requireStreamErrorHandler,
    option: 'allowInTests',
    exemptByDefault: true,
    code: 'fs.createReadStream(p).pipe(res);',
  },
};

const SOURCE = 'src/app.ts';
const TEST = 'src/app.test.ts';

function lint(gate: Gate, filename: string, options?: object): number {
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(
    gate.code,
    [
      {
        files: ['**/*.ts'],
        languageOptions: { parser, sourceType: 'module' },
        plugins: { gate: { rules: { rule: gate.rule as Rule.RuleModule } } },
        rules: { 'gate/rule': options ? ['error', options] : 'error' },
      },
    ],
    filename,
  ).length;
}

describe.each(Object.entries(GATES))('%s test-path gate', (_name, gate) => {
  it('reports the snippet in a source file', () => {
    expect(lint(gate, SOURCE)).toBe(1);
  });

  it('a test file is exempt by default exactly when the default says so', () => {
    expect(lint(gate, TEST)).toBe(gate.exemptByDefault ? 0 : 1);
  });

  it('turning the option on exempts a test file', () => {
    expect(lint(gate, TEST, { [gate.option]: true })).toBe(0);
  });

  it('turning the option off reports in a test file', () => {
    expect(lint(gate, TEST, { [gate.option]: false })).toBe(1);
  });

  it('the option never exempts a source file', () => {
    expect(lint(gate, SOURCE, { [gate.option]: true })).toBe(1);
  });
});

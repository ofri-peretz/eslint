/**
 * Coverage-gap tests for no-weak-hash-algorithm.
 * Layer 1: non-literal createHash arguments, allowInTests bypass.
 * Layer 2: the suggestion fix's defensive `callee is no longer an Identifier`
 * re-check, which the real parser can never produce (the outer guard already
 * proved the callee is an Identifier). Uses createWithMockContext from
 * @interlace/eslint-devkit and mutates the node between report and fix.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import type { TSESLint } from '@typescript-eslint/utils';
import { noWeakHashAlgorithm } from './index';

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

/**
 * The pre-inversion contract: any MD5/SHA-1/MD4/RIPEMD call is a finding.
 *
 * Measured on the 8-repo corpus that produced 6 findings, all content digests —
 * `fileHash(buff)`, `hashString(str)`, `calculateChecksum`. The default now
 * requires a visible security use; these cases keep pinning the algorithm
 * detection, the suggestion fixers and the assignment-target plumbing. The
 * restoring option is applied per-test where it is needed, since the mock-node
 * suites below have no parent chain for a security use to be visible in.
 */

describe('no-weak-hash-algorithm coverage gaps', () => {
  ruleTester.run('no-weak-hash-algorithm', noWeakHashAlgorithm, {
    valid: [
      // Non-literal createHash argument → literal check falls through
      { code: 'crypto.createHash(algorithm);' },
      // allowInTests + test filename → listener bails out
      {
        code: 'crypto.createHash("md5");',
        options: [{ allowInTests: true }],
        filename: 'hash.test.ts',
      },
      // allowInTests but non-test file with safe hash → regex operand false
      {
        code: 'crypto.createHash("sha256");',
        options: [{ allowInTests: true }],
        filename: 'hash.ts',
      },
    ],
    invalid: [],
  });

  describe('Layer 2: suggestion fix defensive re-check', () => {
    it('replaces the callee with sha256 while it is an Identifier, and returns null once it is not', () => {
      const { listeners, reports } = createWithMockContext(
        noWeakHashAlgorithm as never,
        // The mock node has no parent chain, so no security use is visible;
        // this suite is about the fixer, not the classification.
        { options: [{ reportUnclassifiedHashes: true }] } as never
      );
      const callee = {
        type: 'Identifier',
        name: 'sha1',
        range: [0, 4],
      } as never;
      const node = {
        type: 'CallExpression',
        callee,
        arguments: [],
        range: [0, 12],
      } as { type: string; callee: unknown; arguments: never[]; range: number[] };

      (listeners.CallExpression as (n: unknown) => void)(node);

      expect(reports).toHaveLength(1);
      const report = reports[0] as {
        messageId: string;
        data: { algorithm: string; replacement: string };
        suggest: { messageId: string; fix: (f: unknown) => unknown }[];
      };
      expect(report.messageId).toBe('weakHashAlgorithm');
      expect(report.data).toEqual({ algorithm: 'SHA-1', replacement: 'sha256' });
      expect(report.suggest[0].messageId).toBe('useSha256');

      const replaced: unknown[] = [];
      const fixer = {
        replaceText: (target: unknown, text: string) => {
          replaced.push([target, text]);
          return { range: [0, 4], text } as TSESLint.RuleFix;
        },
      };

      // Callee is still an Identifier → fixer path
      const fix1 = report.suggest[0].fix(fixer);
      expect(fix1).toEqual({ range: [0, 4], text: 'sha256' });
      expect(replaced).toEqual([[callee, 'sha256']]);

      // Mutate the node so the callee is no longer an Identifier — a state the
      // parser cannot produce after the outer guard — and re-run the fix.
      node.callee = { type: 'MemberExpression' };
      const fix2 = report.suggest[0].fix(fixer);
      expect(fix2).toBeNull();
      expect(replaced).toHaveLength(1);
    });
  });
});

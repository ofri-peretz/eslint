/**
 * Coverage-gap tests for detect-eval-with-expression.
 * Layer 1: NewExpression that is not `new Function`.
 * Layer 2: generateRefactoringSteps (extracted to module scope) — every
 * category arm including the default arm for categories detectPattern can
 * never emit today ('dynamic' / 'other').
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import {
  detectEvalWithExpression,
  generateRefactoringSteps,
} from './index';

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

describe('detect-eval-with-expression coverage gaps', () => {
  ruleTester.run('detect-eval-with-expression', detectEvalWithExpression, {
    valid: [
      // NewExpression that is not `new Function` → guard falls through
      { code: 'const controller = new AbortController();' },
    ],
    invalid: [],
  });

  describe('Layer 2: generateRefactoringSteps', () => {
    const base = {
      pattern: 'x',
      safeAlternative: 'y',
      example: { bad: 'b', good: 'g' },
      effort: 'low',
    };

    it('returns removal guidance when no pattern was detected', () => {
      expect(generateRefactoringSteps(null)).toContain(
        'Remove eval() usage entirely'
      );
    });

    it.each([
      ['json', 'Replace eval() with JSON.parse()'],
      ['math', 'whitelist of allowed Math functions'],
      ['template', 'Use template literals'],
      ['object', 'Use Map or plain object for key-value access'],
    ] as const)('returns %s-specific guidance', (category, expected) => {
      expect(
        generateRefactoringSteps({ ...base, category })
      ).toContain(expected);
    });

    it('falls back to generic guidance for categories without a dedicated arm', () => {
      const steps = generateRefactoringSteps({ ...base, category: 'other' });
      expect(steps).toContain('Identify the specific use case');
      expect(
        generateRefactoringSteps({ ...base, category: 'dynamic' })
      ).toBe(steps);
    });
  });
});

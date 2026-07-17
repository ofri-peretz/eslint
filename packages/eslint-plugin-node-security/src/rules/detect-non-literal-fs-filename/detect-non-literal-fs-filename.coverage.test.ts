/**
 * Coverage-gap tests for detect-non-literal-fs-filename.
 * Layer 1: isSafePathConstruction early returns, validation-pattern operands
 * (includes/allowlist/regex), hasEarlyExit consequent shapes, zero-arg calls.
 * Layer 2: generateRefactoringSteps default arm and determineRiskLevel
 * non-dangerous fallback (no FS_OPERATIONS entry reaches them today).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import {
  detectNonLiteralFsFilename,
  determineRiskLevel,
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

describe('detect-non-literal-fs-filename coverage gaps', () => {
  ruleTester.run('detect-non-literal-fs-filename', detectNonLiteralFsFilename, {
    valid: [
      // includes() validation on the variable itself → pattern-1 second operand
      {
        code: [
          'function read(userPath, base) {',
          '  if (userPath.includes(base)) { fs.readFile(userPath); }',
          '}',
        ].join('\n'),
      },
      // Guard clause with a DIRECT throw consequent (no block)
      {
        code: [
          'function read(userPath, base) {',
          "  if (!userPath.startsWith(base)) throw new Error('outside');",
          '  fs.readFile(userPath);',
          '}',
        ].join('\n'),
      },
      // Guard clause with a DIRECT return consequent
      {
        code: [
          'function read(userPath, base) {',
          '  if (!userPath.startsWith(base)) return null;',
          '  return fs.readFile(userPath);',
          '}',
        ].join('\n'),
      },
      // Guard clause with a block whose early exit is a return
      {
        code: [
          'function read(userPath, base) {',
          '  if (!userPath.startsWith(base)) { return null; }',
          '  return fs.readFile(userPath);',
          '}',
        ].join('\n'),
      },
    ],
    invalid: [
      // Zero-argument fs call → pathNode null / empty path fallbacks
      { code: 'fs.readFile();', errors: [{ messageId: 'fsPathTraversal' }] },
      // Non-path call expression as path → safe-construction callee guard
      {
        code: 'fs.readFile(buildPath());',
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      // path.basename(...) as path → join/resolve method guard
      {
        code: 'fs.readFile(path.basename(userPath));',
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      // path.join() with zero args → args-length guard
      {
        code: 'fs.readFile(path.join());',
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      // path.join with a non-safe first arg → first-arg guard
      {
        code: "fs.readFile(path.join(userDir, 'a.txt'));",
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      // path.join(__dirname, traversal literal) → traversal guard on rest args
      {
        code: "fs.readFile(path.join(__dirname, '../etc/passwd'));",
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      // Allowlist includes() naming a DIFFERENT variable → arg-match miss
      {
        code: 'if (ALLOWED.includes(other)) { fs.readFile(userPath); }',
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      // Regex test() on a DIFFERENT variable → arg-match miss
      {
        code: 'if (re.test(other)) { fs.readFile(userPath); }',
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      // Enclosing if whose test is a bare Identifier (not a call, not a
      // negated call) → isValidationCall non-CallExpression early return
      {
        code: [
          'function read(userPath, flag) {',
          '  if (flag) { fs.readFile(userPath); }',
          '}',
        ].join('\n'),
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      // Guard clause whose direct consequent is NOT an early exit
      {
        code: [
          'function read(userPath, base) {',
          '  if (!userPath.startsWith(base)) log();',
          '  fs.readFile(userPath);',
          '}',
        ].join('\n'),
        errors: [{ messageId: 'fsPathTraversal' }],
      },
    ],
  });

  describe('Layer 2: extracted helpers', () => {
    const op = {
      method: 'unlink',
      dangerous: false,
      vulnerability: 'file-access',
      safePattern: 'x',
      example: { bad: 'b', good: 'g' },
      effort: '5 minutes',
    };

    it('generateRefactoringSteps falls back to generic guidance for unmapped methods', () => {
      expect(generateRefactoringSteps(op)).toContain(
        'Identify the specific file operation needed'
      );
    });

    it('determineRiskLevel returns MEDIUM for non-dangerous operations without traversal', () => {
      expect(determineRiskLevel(op, 'uploads/file.txt')).toBe('MEDIUM');
      expect(determineRiskLevel(op, '../escape')).toBe('CRITICAL');
      expect(
        determineRiskLevel({ ...op, dangerous: true }, 'uploads/file.txt')
      ).toBe('HIGH');
    });
  });
});

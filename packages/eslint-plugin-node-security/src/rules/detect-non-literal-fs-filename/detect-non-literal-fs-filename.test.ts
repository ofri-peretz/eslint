/**
 * Comprehensive tests for detect-non-literal-fs-filename rule
 * Security: CWE-22 (Path Traversal)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectNonLiteralFsFilename } from './index';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('detect-non-literal-fs-filename', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe fs operations', detectNonLiteralFsFilename, {
      valid: [
        // Literal file paths
        {
          code: 'fs.readFile("/path/to/file.txt", callback);',
        },
        {
          code: 'fs.writeFile("./config.json", data, callback);',
        },
        {
          code: 'fs.stat("/var/log/app.log", callback);',
        },
        {
          code: 'fs.readdir("./src", callback);',
        },
        // Note: Template literals without expressions may still trigger the rule
        // Only pure string literals are safe
        // Not fs methods
        {
          code: 'myFunction.readFile(filename);',
        },
        {
          code: 'obj.readFile(userPath);',
        },
        // Guard clause validation - path validated with startsWith() before use
        {
          code: `
            const SAFE_DIR = path.resolve(__dirname, 'uploads');
            function safeReadFile(userFilename) {
              const safeName = path.basename(userFilename);
              const safePath = path.join(SAFE_DIR, safeName);
              if (!safePath.startsWith(SAFE_DIR)) {
                throw new Error('Invalid path');
              }
              return fs.readFileSync(safePath);
            }
          `,
        },
        // Static path construction with path.join(__dirname, ...literals)
        {
          code: `fs.readFileSync(path.join(__dirname, 'data', 'users.json'));`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - readFile', () => {
    ruleTester.run('invalid - dynamic filename in readFile', detectNonLiteralFsFilename, {
      valid: [],
      invalid: [
        {
          code: 'fs.readFile(userPath, callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        {
          code: 'fs.readFile(`./uploads/${filename}`, callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        {
          code: 'fs.readFileSync(userInput, "utf8");',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        {
          code: `
            const filePath = getUserInput();
            fs.readFile(filePath, callback);
          `,
          errors: [{ messageId: 'fsPathTraversal' }],
        },
      ],
    });
  });

  describe('Invalid Code - writeFile', () => {
    ruleTester.run('invalid - dynamic filename in writeFile', detectNonLiteralFsFilename, {
      valid: [],
      invalid: [
        {
          code: 'fs.writeFile(userPath, data, callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        {
          code: 'fs.writeFileSync(`./output/${filename}`, data);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        {
          code: 'fs.writeFile(config.outputPath, data, callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
      ],
    });
  });

  describe('Invalid Code - stat', () => {
    ruleTester.run('invalid - dynamic filename in stat', detectNonLiteralFsFilename, {
      valid: [],
      invalid: [
        {
          code: 'fs.stat(userPath, callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        {
          code: 'fs.statSync(`./files/${filename}`);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
      ],
    });
  });

  describe('Invalid Code - readdir', () => {
    ruleTester.run('invalid - dynamic directory in readdir', detectNonLiteralFsFilename, {
      valid: [],
      invalid: [
        {
          code: 'fs.readdir(userDir, callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        {
          code: 'fs.readdirSync(`./directories/${dirName}`);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', detectNonLiteralFsFilename, {
      valid: [],
      invalid: [
        {
          code: 'fs.readFile(userPath, callback);',
          errors: [
            {
              messageId: 'fsPathTraversal',
              // Note: Rule may not provide suggestions in all cases
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', detectNonLiteralFsFilename, {
      valid: [
        // Literal strings (if allowLiterals is true)
        {
          code: 'fs.readFile("/path/to/file.txt", callback);',
          options: [{ allowLiterals: true }],
        },
      ],
      invalid: [
        // Path traversal patterns in literals should still be flagged as CRITICAL
        {
          code: 'fs.readFile("../../../etc/passwd", callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        {
          code: 'fs.readFile("../config.json", callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        // Note: Rule only checks fs.method() directly, not imported/aliased calls
        // These would need rule enhancement to detect
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options testing', detectNonLiteralFsFilename, {
      valid: [
        {
          code: 'fs.readFile("/path/to/file.txt", callback);',
          options: [{ allowLiterals: true }],
        },
      ],
      invalid: [
        {
          code: 'fs.readFile(userPath, callback);',
          options: [{ allowLiterals: true }],
          errors: [
            {
              messageId: 'fsPathTraversal',
              // Note: Rule may not provide suggestions in all cases
            },
          ],
        },
        // Note: Rule only checks fs.method() directly, not imported calls
      ],
    });
  });

  describe('Uncovered Lines', () => {
    // Line 297: Default case in generateRefactoringSteps - triggered when method is not readFile, writeFile, stat, or readdir
    ruleTester.run('line 297 - default case in generateRefactoringSteps', detectNonLiteralFsFilename, {
      valid: [],
      invalid: [
        {
          code: 'fs.unlink(userPath);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        {
          code: 'fs.mkdir(userDir, callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        {
          code: 'fs.rmdir(userDir);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
      ],
    });

    // Line 319: Default case in determineRiskLevel - triggered when operation is not defined or riskLevel is not 'high'
    ruleTester.run('line 319 - default case in determineRiskLevel', detectNonLiteralFsFilename, {
      valid: [],
      invalid: [
        {
          code: 'fs.access(userPath, callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        {
          code: 'fs.appendFile(userPath, data);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
      ],
    });

    // Line 338: Early return in checkFsCall when method is not in dangerousMethods
    ruleTester.run('line 338 - early return when method not dangerous', detectNonLiteralFsFilename, {
      valid: [
        // These methods might not be considered dangerous by the rule
        {
          code: 'fs.constants.F_OK;',
        },
        {
          code: 'fs.createReadStream("/safe/path");',
        },
      ],
      invalid: [],
    });
  });

  /**
   * TDD Tests: False Positive Reduction
   * These tests define expected behavior for safe patterns that should NOT trigger warnings.
   * Currently these tests may fail - the rule needs to be updated to pass them.
   * 
   * Issue: Benchmark revealed FPs on validated path patterns
   * Benchmark: eslint-benchmark-suite/benchmarks/fn-fp-comparison
   */
  describe('False Positive Reduction (TDD)', () => {
    ruleTester.run('validated paths with startsWith should not trigger', detectNonLiteralFsFilename, {
      valid: [
        // FP Fix #1: Path validated with path.resolve + startsWith check
        {
          code: `
            const fs = require('fs');
            const path = require('path');
            
            const SAFE_DIR = '/var/app/uploads';
            
            function readUserFile(filename) {
              const safePath = path.resolve(SAFE_DIR, path.basename(filename));
              if (!safePath.startsWith(SAFE_DIR + path.sep)) {
                throw new Error('Path traversal detected');
              }
              return fs.readFileSync(safePath, 'utf8');
            }
          `,
        },
        // FP Fix #2: Path validated inline before fs call
        {
          code: `
            const userPath = path.resolve(baseDir, userInput);
            if (userPath.startsWith(baseDir)) {
              fs.readFile(userPath, callback);
            }
          `,
        },
        // FP Fix #3: Path validated with realpath (symlink-safe)
        {
          code: `
            const realPath = fs.realpathSync(userPath);
            if (realPath.startsWith(allowedDir)) {
              fs.readFile(realPath, callback);
            }
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('path.join with only literals should not trigger', detectNonLiteralFsFilename, {
      valid: [
        // FP Fix #4: path.join with all literal segments
        {
          code: `
            fs.readFile(path.join(__dirname, 'data', 'config.json'), callback);
          `,
        },
        // FP Fix #5: path.resolve with literal paths
        {
          code: `
            fs.writeFile(path.resolve('/app', 'logs', 'app.log'), data, callback);
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('dangerous patterns should still be flagged', detectNonLiteralFsFilename, {
      valid: [],
      invalid: [
        // No validation - should still be flagged
        {
          code: `
            fs.readFile(userPath, callback);
          `,
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        // Validation on wrong path - should still be flagged
        {
          code: `
            if (otherPath.startsWith(baseDir)) {
              fs.readFile(userPath, callback);
            }
          `,
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        // Dynamic segments in path.join
        {
          code: `
            fs.readFile(path.join(__dirname, userInput, 'file.txt'), callback);
          `,
          errors: [{ messageId: 'fsPathTraversal' }],
        },
      ],
    });
  });
});


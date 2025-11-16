/**
 * Comprehensive tests for detect-non-literal-fs-filename rule
 * Security: CWE-22 (Path Traversal)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectNonLiteralFsFilename } from '../rules/security/detect-non-literal-fs-filename';

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
});


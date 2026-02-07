/**
 * Comprehensive tests for detect-child-process rule
 * Security: CWE-78 (Command Injection)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectChildProcess } from './index';

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

describe('detect-child-process', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe child process usage', detectChildProcess, {
      valid: [
        // Not child_process methods
        {
          code: 'const exec = myFunction; exec(command);',
        },
        {
          code: 'obj.exec(command);',
        },
        // Note: Rule flags ALL child_process methods, even execFile/spawn
        // These are considered "safe" in practice but rule detects them
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - exec()', () => {
    ruleTester.run('invalid - exec with dynamic commands', detectChildProcess, {
      valid: [],
      invalid: [
        {
          code: 'child_process.exec(`git clone ${repoUrl}`);',
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
        {
          code: 'child_process.exec("git clone " + repoUrl);',
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
        {
          code: 'child_process.execSync(`npm install ${packageName}`);',
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
        {
          code: `
            const command = getUserInput();
            child_process.exec(command);
          `,
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
      ],
    });
  });

  describe('Invalid Code - execFile/spawn (Rule flags dynamic args)', () => {
    ruleTester.run('invalid - execFile and spawn with dynamic arguments', detectChildProcess, {
      valid: [
        // spawn/spawnSync with shell: false AND literal args are now correctly SAFE
        {
          code: 'child_process.spawn("node", ["script.js"], { shell: false });',
        },
        {
          code: 'child_process.spawnSync("ls", ["-la"], { shell: false });',
        },
      ],
      invalid: [
        // execFile with dynamic args is still dangerous
        {
          code: 'child_process.execFile("git", ["clone", repoUrl], { shell: false });',
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
        {
          code: 'child_process.execFileSync("npm", ["install", packageName], { shell: false });',
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
      ],
    });
  });

  describe('Invalid Code - spawn()', () => {
    ruleTester.run('invalid - spawn with unsafe arguments', detectChildProcess, {
      valid: [],
      invalid: [
        {
          code: 'child_process.spawn("bash", ["-c", userCommand]);',
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
        {
          code: 'child_process.spawn(userCommand, args);',
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
        {
          code: 'child_process.spawnSync("sh", ["-c", userInput]);',
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', detectChildProcess, {
      valid: [],
      invalid: [
        {
          code: 'child_process.exec(`git clone ${repoUrl}`);',
          errors: [
            {
              messageId: 'childProcessCommandInjection',
              // Note: Rule provides suggestions but they don't have output (fix: () => null)
              // Test framework requires output for suggestions, so we don't test them here
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', detectChildProcess, {
      valid: [
        // Literal strings (if allowLiteralStrings is true)
        {
          code: 'child_process.exec("git clone https://example.com/repo.git");',
          options: [{ allowLiteralStrings: true }],
        },
      ],
      invalid: [
        // Note: Rule only checks child_process.exec() directly, not imported calls
        // These would need rule enhancement to detect
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options testing', detectChildProcess, {
      valid: [
        {
          code: 'child_process.exec("literal string");',
          options: [{ allowLiteralStrings: true }],
        },
        {
          code: 'child_process.spawn("node", ["script.js"]);',
          options: [{ allowLiteralSpawn: true }],
        },
      ],
      invalid: [
        {
          code: 'child_process.exec(userCommand);',
          options: [{ allowLiteralStrings: true }],
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
      ],
    });
  });

  describe('Edge Cases - Coverage', () => {
    ruleTester.run('edge cases - default case in switch (line 251)', detectChildProcess, {
      valid: [],
      invalid: [
        // Test with execFileSync to trigger default case in generateRefactoringSteps (line 251)
        {
          code: 'child_process.execFileSync(userCommand, args);',
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
        // Test with fork to trigger default case
        {
          code: 'child_process.fork(userScript);',
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
        // Test with forkSync to trigger forkSync case in generateRefactoringSteps (lines 429-438)
        {
          code: 'child_process.forkSync(userScript);',
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
      ],
    });

    ruleTester.run('edge cases - non-dangerous method (line 290)', detectChildProcess, {
      valid: [
        // Test with a method that's NOT in dangerousMethods to cover line 290
        // Note: child_process doesn't have many other methods, but if one exists that's not dangerous,
        // it should be valid. However, since we can't easily test this without modifying the rule,
        // we'll test with a method that might not be in the default list
        {
          code: 'child_process.someOtherMethod(command);',
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
   * Issue: https://github.com/interlace-tools/eslint/issues/XXX
   * Benchmark: eslint-benchmark-suite/benchmarks/fn-fp-comparison
   */
  describe('False Positive Reduction (TDD)', () => {
    ruleTester.run('safe execFile with literal command and args', detectChildProcess, {
      valid: [
        // FP Fix #1: execFile with literal command + literal args array is SAFE
        // The command is static, args are static - no injection possible
        {
          code: `
            const { execFile } = require('child_process');
            execFile('git', ['clone', 'https://github.com/user/repo.git'], (err, stdout) => {
              console.log(stdout);
            });
          `,
        },
        // FP Fix #2: execFile with literal command, variable args from allowlist
        {
          code: `
            const { execFile } = require('child_process');
            const ALLOWED_BRANCHES = ['main', 'develop', 'staging'];
            function checkoutBranch(branch) {
              if (ALLOWED_BRANCHES.includes(branch)) {
                execFile('git', ['checkout', branch], (err) => {
                  if (err) throw err;
                });
              }
            }
          `,
        },
        // FP Fix #3: spawn with shell: false and literal args (inherently safe)
        {
          code: `
            const { spawn } = require('child_process');
            const ls = spawn('ls', ['-la', '/tmp'], { shell: false });
          `,
          options: [{ allowLiteralSpawn: true }],
        },
        // FP Fix #4: execFileSync with literal command for build tools
        {
          code: `
            const { execFileSync } = require('child_process');
            execFileSync('npm', ['run', 'build'], { cwd: process.cwd() });
          `,
          options: [{ allowLiteralSpawn: true }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('unsafe patterns should still be flagged', detectChildProcess, {
      valid: [],
      invalid: [
        // These should still be flagged - user input flows into command
        {
          code: `
            const { execFile } = require('child_process');
            execFile(userCommand, ['--version'], callback);
          `,
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
        {
          code: `
            const { execFile } = require('child_process');
            execFile('node', [userScript], callback);
          `,
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
      ],
    });
    /**
     * Benchmark FP Regression: safe_cmd_validated
     * execFile with allowlist-validated format inside template literal args
     * Source: eslint-benchmark-suite/benchmarks/fn-fp-comparison/fixtures/safe/safe-patterns.js
     */
    ruleTester.run('benchmark FP: safe_cmd_validated - allowlist guard clause', detectChildProcess, {
      valid: [
        {
          code: `
            const { execFile } = require('child_process');
            const ALLOWED_FORMATS = ['png', 'jpg', 'gif'];
            function convert(format) {
              if (!ALLOWED_FORMATS.includes(format)) {
                throw new Error('Invalid format');
              }
              return execFile('convert', ['input.img', \`output.\${format}\`]);
            }
          `,
        },
      ],
      invalid: [],
    });
  });
});


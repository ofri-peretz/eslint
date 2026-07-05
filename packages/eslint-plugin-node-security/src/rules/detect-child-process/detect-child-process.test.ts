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


// ---------------------------------------------------------------------------
// Coverage-completion wave: dual-layer tests for previously untested branches.
// Layer 1: RuleTester fixtures through the real parser.
// Layer 2: direct unit tests of module-level helpers.
// ---------------------------------------------------------------------------
import { expect } from 'vitest';
import { generateRefactoringSteps } from './index';
import type { CommandPattern } from './index';

describe('detect-child-process — coverage completion', () => {
  describe('argument-shape edge cases', () => {
    ruleTester.run('zero-arg and non-literal second-arg calls', detectChildProcess, {
      valid: [
        // Second arg is a plain Literal (not an array) — hasOnlyLiteralArgs=true, execFile has no shell
        {
          code: `const cp = require('child_process'); cp.execFile('ls', '-l');`,
        },
        // spawn all-literal with NO options arg — default shell:false is safe
        {
          code: `const cp = require('child_process'); cp.spawn('ls', ['-l']);`,
        },
        // spawn all-literal with explicit { shell: false }
        {
          code: `const cp = require('child_process'); cp.spawn('ls', ['-l'], { shell: false });`,
        },
        // spawn all-literal with options object without a shell property
        {
          code: `const cp = require('child_process'); cp.spawn('ls', ['-l'], { cwd: '/tmp' });`,
        },
        // spawn all-literal with non-object options arg (identifier) — treated as default shell:false
        {
          code: `const legacyOpts = getOpts(); const cp = require('child_process'); cp.spawn('ls', ['-l'], legacyOpts);`,
        },
      ],
      invalid: [
        // exec() with zero arguments — hasOnlyLiteralArgs returns false on empty args
        {
          code: `const cp = require('child_process'); cp.exec();`,
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
        // execFile with object (non-array, non-literal) second arg — dynamic
        {
          code: `const cp = require('child_process'); cp.execFile('ls', { cwd: '/' });`,
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
        // exec with literal command + callback — not "only literal args", allowLiteralStrings off
        {
          code: `const cp = require('child_process'); cp.exec('ls -l', function (err, out) {});`,
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
        // spawn all-literal but shell: true — unsafe
        {
          code: `const cp = require('child_process'); cp.spawn('ls', ['-l'], { shell: true });`,
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
      ],
    });
  });

  describe('allowLiteralStrings option', () => {
    ruleTester.run('legacy allowLiteralStrings path', detectChildProcess, {
      valid: [
        // Literal exec + callback allowed only via the legacy option
        {
          code: `const cp = require('child_process'); cp.exec('ls -l', function (err, out) {});`,
          options: [{ allowLiteralStrings: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('additionalMethods option (no COMMAND_PATTERNS entry)', () => {
    ruleTester.run('custom method reported with fallback metadata', detectChildProcess, {
      valid: [],
      invalid: [
        // 'doExec' has no COMMAND_PATTERNS entry: exercises the pattern=null fallbacks
        {
          code: `const { doExec } = require('child_process'); doExec(userInput);`,
          options: [{ additionalMethods: ['doExec'] }],
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
      ],
    });
  });

  describe('allowlist guard-clause variants', () => {
    ruleTester.run('generic guards and ancestor guards', detectChildProcess, {
      valid: [
        // Pattern 1: call inside `if (ALLOWED.includes(arg))` ancestor
        {
          code: `
            const { execFile } = require('child_process');
            function go(fmt) {
              if (ALLOWED.includes(fmt)) {
                execFile('convert', [fmt]);
              }
            }
          `,
        },
        // Pattern 2 generic guard: includes() WITHOUT args + identifier call arg
        {
          code: `
            const { execFile } = require('child_process');
            function run(tool) {
              if (!getAllowed().includes()) {
                throw new Error('nope');
              }
              execFile(tool);
            }
          `,
        },
        // Pattern 2 generic guard: bare ReturnStatement consequent + array arg with identifier
        {
          code: `
            const { execFile } = require('child_process');
            function run2(tool) {
              if (!getAllowed().includes()) return;
              execFile('convert', [tool]);
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('import tracking (ESM)', () => {
    ruleTester.run('import declarations', detectChildProcess, {
      valid: [
        // Non-child_process import is ignored
        {
          code: `import fs from 'fs'; fs.readFile(userPath);`,
        },
      ],
      invalid: [
        // Named import
        {
          code: `import { exec } from 'child_process'; exec(cmd);`,
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
        // Default import alias
        {
          code: `import cp from 'child_process'; cp.exec(cmd);`,
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
        // Namespace import alias
        {
          code: `import * as child from 'child_process'; child.execSync(cmd);`,
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
      ],
    });
  });

  describe('require tracking (CJS)', () => {
    ruleTester.run('require declarator variants', detectChildProcess, {
      valid: [
        // Declarator without init
        {
          code: `let pending; pending = 1;`,
        },
        // require() with no argument
        {
          code: `const cp = require(); cp.exec('ls');`,
        },
        // require(dynamic) — not a literal
        {
          code: `const cp = require(moduleName); cp.exec('ls');`,
        },
        // require of a different module — alias NOT tracked
        {
          code: `const cp = require('fs'); cp.exec(userCmd);`,
        },
        // Destructured require of a different module
        {
          code: `const { exec } = require('os'); exec(userCmd);`,
        },
      ],
      invalid: [
        // Alias tracked from require('child_process')
        {
          code: `const cp = require('child_process'); cp.exec(userCmd);`,
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
        // Destructured with default value (AssignmentPattern) — falls back to key name
        {
          code: `const { exec = fallbackExec } = require('child_process'); exec(cmd);`,
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
      ],
    });
  });

  describe('generateRefactoringSteps (unit)', () => {
    const pattern = (method: string): CommandPattern => ({
      method,
      dangerous: true,
      vulnerability: 'command-injection',
      safeAlternatives: ['x'],
      example: { bad: 'b', good: ['g'] },
      effort: '1 minute',
    });

    it('returns method-specific steps for every known method', () => {
      expect(generateRefactoringSteps(pattern('exec'))).toContain('Replace exec() with execFile() or spawn()');
      expect(generateRefactoringSteps(pattern('execSync'))).toContain('Replace exec() with execFile() or spawn()');
      expect(generateRefactoringSteps(pattern('spawn'))).toContain('cross-spawn for cross-platform safety');
      expect(generateRefactoringSteps(pattern('execFile'))).toContain('Replace execFile() with spawn() for better security');
      expect(generateRefactoringSteps(pattern('execFileSync'))).toContain('Replace execFileSync() with spawnSync() for better security');
      expect(generateRefactoringSteps(pattern('spawnSync'))).toContain('Handle synchronous execution properly');
      expect(generateRefactoringSteps(pattern('fork'))).toContain('Replace fork() with spawn() for Node.js scripts');
      expect(generateRefactoringSteps(pattern('forkSync'))).toContain('Replace forkSync() with spawnSync() for Node.js scripts');
    });

    it('returns generic steps for a method without a dedicated case', () => {
      const steps = generateRefactoringSteps(pattern('customExec'));
      expect(steps).toContain('Identify the specific command execution need');
      expect(steps).toContain('Test with malicious inputs');
    });
  });
});

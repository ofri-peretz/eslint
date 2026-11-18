/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A parameter that only string literals ever reach is a constant.
 *
 * tolaria's iOS QA scripts look a binary up through the shell:
 *
 *   function commandPath(command) {
 *     const result = spawnSync('sh', ['-lc', `command -v ${command}`], …)
 *   }
 *   const direct = commandPath('axe')
 *
 * `command` is a parameter, so the rule reported it as an assembled command
 * line. But the function is local to the file, never exported, never passed
 * anywhere as a value, and its only call passes the literal `'axe'`. Every
 * value `command` can hold is written in this file, which is the same evidence
 * a `const` gives.
 *
 * All four conditions are needed, and each invalid case below breaks one:
 * the function must be file-local, every reference to it must be a direct
 * call, every call must pass a literal in that position, and the parameter
 * must never be reassigned.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDynamicCommandString } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const shellFlag = [{ messageId: 'shellFlagInjection' as const }];

describe('no-dynamic-command-string — a parameter only literals reach', () => {
  ruleTester.run('caller-constant', noDynamicCommandString, {
    valid: [
      {
        // @source refactoringhq/tolaria apps/mobile/scripts/assert-ios-keyboard-shortcuts.mjs:246
        // @found real-source scan
        name: 'FP: commandPath is only ever called with the literal axe',
        filename: 'apps/mobile/scripts/assert-ios-keyboard-shortcuts.mjs',
        code: `
          import { spawnSync } from 'node:child_process';
          function axePath() {
            const command = commandPath('axe');
            return command || cachedAxeBinary();
          }
          function commandPath(command) {
            const result = spawnSync('sh', ['-lc', \`command -v \${command}\`], { encoding: 'utf8' });
            return result.status === 0 ? result.stdout.trim() : '';
          }
        `,
      },
      {
        // @source refactoringhq/tolaria apps/mobile/scripts/click-ios-simulator-element.mjs:77
        // @found real-source scan
        name: 'FP: the same helper in a second script, called before it is declared',
        filename: 'apps/mobile/scripts/click-ios-simulator-element.mjs',
        code: `
          import { spawnSync } from 'node:child_process';
          const direct = commandPath('axe');
          function commandPath(command) {
            const result = spawnSync('sh', ['-lc', \`command -v \${command}\`], { encoding: 'utf8' });
            return result.status === 0 ? result.stdout.trim() : '';
          }
        `,
      },
      {
        name: 'several literal callers, an arrow function, and a template with no holes',
        code: `
          import { spawn } from 'node:child_process';
          const which = (tool) => spawn('bash', ['-c', 'command -v ' + tool]);
          which('git');
          which(\`node\`);
        `,
      },
      {
        name: 'the parameter in a different position from the one the callers vary',
        code: `
          import { spawn } from 'node:child_process';
          function run(label, tool) { log(label); return spawn('sh', ['-c', \`\${tool} --version\`]); }
          run(userLabel, 'git');
        `,
      },
    ],
    invalid: [
      {
        name: 'a caller that passes a variable puts its value in the command line',
        code: `
          import { spawnSync } from 'node:child_process';
          function commandPath(command) { return spawnSync('sh', ['-lc', \`command -v \${command}\`]); }
          commandPath('axe');
          commandPath(process.argv[2]);
        `,
        errors: shellFlag,
      },
      {
        name: 'an exported function has callers this file cannot see',
        code: `
          import { spawnSync } from 'node:child_process';
          export function commandPath(command) { return spawnSync('sh', ['-lc', \`command -v \${command}\`]); }
          commandPath('axe');
        `,
        errors: shellFlag,
      },
      {
        name: 'exported by name later in the file, the same',
        code: `
          import { spawnSync } from 'node:child_process';
          function commandPath(command) { return spawnSync('sh', ['-lc', \`command -v \${command}\`]); }
          commandPath('axe');
          export { commandPath };
        `,
        errors: shellFlag,
      },
      {
        name: 'a function passed as a value can be called with anything',
        code: `
          import { spawnSync } from 'node:child_process';
          function commandPath(command) { return spawnSync('sh', ['-lc', \`command -v \${command}\`]); }
          commandPath('axe');
          tools.map(commandPath);
        `,
        errors: shellFlag,
      },
      {
        name: 'a reassigned parameter is not the value the callers passed',
        code: `
          import { spawnSync } from 'node:child_process';
          function commandPath(command) { command = readInput(); return spawnSync('sh', ['-lc', \`command -v \${command}\`]); }
          commandPath('axe');
        `,
        errors: shellFlag,
      },
      {
        name: 'a function nobody calls has no callers to prove anything',
        code: `
          import { spawnSync } from 'node:child_process';
          function commandPath(command) { return spawnSync('sh', ['-lc', \`command -v \${command}\`]); }
        `,
        errors: shellFlag,
      },
      {
        name: 'a caller that omits the argument passes undefined, not a literal',
        code: `
          import { spawnSync } from 'node:child_process';
          function commandPath(command) { return spawnSync('sh', ['-lc', \`command -v \${command}\`]); }
          commandPath();
        `,
        errors: shellFlag,
      },
      {
        name: 'a spread argument hides which value lands in the parameter',
        code: `
          import { spawnSync } from 'node:child_process';
          function commandPath(command) { return spawnSync('sh', ['-lc', \`command -v \${command}\`]); }
          commandPath(...args);
        `,
        errors: shellFlag,
      },
      {
        name: 'a destructured parameter is not followed',
        code: `
          import { spawnSync } from 'node:child_process';
          function commandPath({ command }) { return spawnSync('sh', ['-lc', \`command -v \${command}\`]); }
          commandPath({ command: 'axe' });
        `,
        errors: shellFlag,
      },
      {
        name: 'a variable from the enclosing scope is not a parameter',
        code: `
          import { spawnSync } from 'node:child_process';
          let command = 'axe';
          function commandPath() { return spawnSync('sh', ['-lc', \`command -v \${command}\`]); }
          commandPath();
        `,
        errors: shellFlag,
      },
      {
        name: 'a method has callers through this, which this rule does not follow',
        code: `
          import { spawnSync } from 'node:child_process';
          class Tools { path(command) { return spawnSync('sh', ['-lc', \`command -v \${command}\`]); } }
          new Tools().path('axe');
        `,
        errors: shellFlag,
      },
    ],
  });
});

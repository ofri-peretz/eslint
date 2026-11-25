/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Guards the oxmutate run found unpinned: each case is an input on which the
 * rule as written and one surviving mutant of it disagree. Most sit in the
 * proofs that suppress a report (a parameter only literals reach, an untouched
 * const object), where a loosened guard is a false negative nothing noticed.
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

const FLAG = [{ messageId: 'shellFlagInjection' as const }];
const HELPER =
  "function run(command) { return spawn('sh', ['-c', `echo ${command}`]); }";

describe('no-dynamic-command-string survivor guards', () => {
  ruleTester.run('no-dynamic-command-string', noDynamicCommandString, {
    valid: [
      {
        name: 'an option that only starts like -c is not a command flag',
        code: "spawn('sh', ['-c1', task]);",
      },
      {
        name: 'a product is not an assembled string',
        code: "spawn('sh', ['-c', total * count]);",
      },
      {
        name: 'a spread after the position of the parameter does not hide the literal',
        code: `${HELPER} run('git', ...rest);`,
      },
      {
        name: 'reading a const object property into another variable is not a write',
        code: "const TOOLS = { tool: 'git' }; let copy; copy = TOOLS.tool; spawn('sh', ['-c', `${TOOLS.tool} --version`]);",
      },
      {
        name: 'typeof of a const object property is not a delete',
        code: "const TOOLS = { tool: 'git' }; if (typeof TOOLS.tool === 'string') { spawn('sh', ['-c', `${TOOLS.tool} --version`]); }",
      },
      {
        name: 'a call that merely wraps a known spawner is not that spawner',
        code: "const run = memoize(execFile); run('bash', ['-c', `deploy ${env}`]);",
      },
    ],
    invalid: [
      {
        name: 'a function destructured out of a const is not a named binding of the function',
        code: "const [run] = [(command) => spawn('sh', ['-c', `echo ${command}`])]; run('git');",
        errors: FLAG,
      },
      {
        name: 'an arrow bound by a destructuring pattern has no single name to track',
        code: "const [run] = (command) => spawn('sh', ['-c', `echo ${command}`]); run('git');",
        errors: FLAG,
      },
      {
        name: 'a let-bound function can be reassigned, so its callers prove nothing',
        code: `let run = (command) => spawn('sh', ['-c', \`echo \${command}\`]); run('git');`,
        errors: FLAG,
      },
      {
        name: 'a default export has callers this file cannot see',
        code: `export default function run(command) { return spawn('sh', ['-c', \`echo \${command}\`]); } run('git');`,
        errors: FLAG,
      },
      {
        name: 'a parameter redeclared with var is more than one definition',
        code: "function run(command) { var command; return spawn('sh', ['-c', `echo ${command}`]); } run('git');",
        errors: FLAG,
      },
      {
        name: 'an imported binding is not a parameter',
        code: "import command from './command'; spawn('sh', ['-c', command]);",
        errors: FLAG,
      },
      {
        name: 'passing the function on as an argument is not a direct call',
        code: `${HELPER} run('git'); register('git', run);`,
        errors: FLAG,
      },
      {
        name: 'a new expression is not a plain call of the function',
        code: `${HELPER} new run('git');`,
        errors: FLAG,
      },
      {
        name: 'a spread before the parameter position shifts it',
        code: `function run(first, command) { return spawn('sh', ['-c', \`echo \${command}\`]); } run(...args, 'git');`,
        errors: FLAG,
      },
      {
        name: 'a const object handed to other code may be changed there',
        code: "const TOOLS = { tool: 'git' }; configure(TOOLS); spawn('sh', ['-c', `echo ${TOOLS.tool}`]);",
        errors: FLAG,
      },
      {
        name: 'a const object used as a computed key is not a plain property read',
        code: "const TOOLS = { tool: 'git' }; lookup[TOOLS]; spawn('sh', ['-c', `echo ${TOOLS.tool}`]);",
        errors: FLAG,
      },
      {
        name: 'incrementing a const object property changes it',
        code: "const TOOLS = { tool: 'git', n: 0 }; TOOLS.n++; spawn('sh', ['-c', `echo ${TOOLS.tool}`]);",
        errors: FLAG,
      },
      {
        name: 'deleting a const object property changes it',
        code: "const TOOLS = { tool: 'git' }; delete TOOLS.tool; spawn('sh', ['-c', `echo ${TOOLS.tool}`]);",
        errors: FLAG,
      },
      {
        name: 'a private name is not the public key of the same spelling',
        code: "const SCRIPTS = { build: 'npm run build' }; class Job { #build = 1; go() { spawn('sh', ['-c', SCRIPTS.#build]); } }",
        errors: FLAG,
      },
    ],
  });
});

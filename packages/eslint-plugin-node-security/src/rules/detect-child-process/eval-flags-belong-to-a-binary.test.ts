/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `-c` is not a universal token.
 *
 * `usesShell` treated any EVAL_FLAG in argv as proof that the next entry is
 * source text, whatever binary was being run. The comment defending that said
 * reading the flag "rather than enumerating interpreters" avoided a list to
 * maintain — but a flag only means what the program parsing it says it means.
 *
 * Found on the 20-repository real-source corpus, in n8n's `scripts/dev-up.mjs`:
 *
 *   execFileSync('gh', ['codespace','ports','visibility',`${port}:org`,'-c',name])
 *
 * `-c` there is gh's own `--codespace`. Every argv entry is a literal or a
 * template of literals, no shell is anywhere near it, and the rule reported
 * CWE-78 command injection at CVSS 9.8. Deciding by a TOKEN rather than by the
 * program that parses it is the defect `lint:name-inference` exists to catch,
 * committed by a security rule.
 *
 * The gate is deliberately one-sided: it only ever SUPPRESSES, and only when the
 * command is a literal naming a binary we can place. A command we cannot name
 * keeps the old conservative reading, because then we genuinely do not know what
 * parses the flag — the `execFileSync(bin, ['-c', name])` case below.
 *
 * The first version of this fix shared ONE flag set across every interpreter,
 * which is the same defect one level up: it claimed `php -e` and `deno -e` were
 * eval — PHP's `-e` emits debugger/profiler information, Deno has no `-e` — and
 * missed `php -r`, `deno eval`, `node -p` and `perl -E`. Wrong in both
 * directions. Caught in review on #584; the per-binary cases below are the lock.
 *
 * Sources: `--help` on this machine for node, python3, ruby and perl; the CLI
 * manuals for php and deno.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { detectChildProcess } from './index';

const ruleTester = new RuleTester();

ruleTester.run('detect-child-process — eval flags belong to a binary', detectChildProcess, {
  valid: [
    {
      // The corpus case, verbatim in shape.
      name: "gh's -c is --codespace, not an eval flag",
      code: `const { execFileSync } = require('child_process');
             execFileSync('gh', ['codespace', 'ports', 'visibility', '8080:org', '-c', name], { stdio: 'ignore' });`,
    },
    {
      // Any other literal non-interpreter with a -c of its own.
      name: 'a literal non-interpreter keeps its own flags',
      code: `const { execFileSync } = require('child_process'); execFileSync('docker', ['ps', '-c', 'x']);`,
    },
    {
      // PHP's -e is `--profile-info`, not eval. Its eval flag is -r, below.
      name: "php -e generates debugger info, it does not evaluate",
      code: `const { execFileSync } = require('child_process'); execFileSync('php', ['-e', x]);`,
    },
    {
      // Deno evaluates through the `eval` SUBCOMMAND; it has no -e.
      name: 'deno has no -e',
      code: `const { execFileSync } = require('child_process'); execFileSync('deno', ['-e', x]);`,
    },
    {
      // Python evaluates with -c. `-e` is not a Python option at all.
      name: 'python -e is not a python option',
      code: `const { execFileSync } = require('child_process'); execFileSync('python3', ['-e', x]);`,
    },
  ],
  invalid: [
    {
      // FN GUARD: the whole point of EVAL_FLAGS, still working.
      name: "sh -c really is source text",
      code: `const { execFileSync } = require('child_process'); execFileSync('sh', ['-c', name]);`,
      errors: [{ messageId: 'childProcessCommandInjection' }],
    },
    {
      name: 'node -e really is source text',
      code: `const { execFile } = require('child_process'); execFile('node', ['-e', src], cb);`,
      errors: [{ messageId: 'childProcessCommandInjection' }],
    },
    {
      name: 'cmd /c really is source text',
      code: `const { spawn } = require('child_process'); spawn('cmd', ['/c', line]);`,
      errors: [{ messageId: 'childProcessCommandInjection' }],
    },
    {
      // FN GUARD: php really does run code, just not through -e.
      name: 'php -r runs code',
      code: `const { execFileSync } = require('child_process'); execFileSync('php', ['-r', x]);`,
      errors: [{ messageId: 'childProcessCommandInjection' }],
    },
    {
      // FN GUARD: deno's eval is a subcommand, so the token carries no dash.
      name: 'deno eval runs code',
      code: `const { execFileSync } = require('child_process'); execFileSync('deno', ['eval', x]);`,
      errors: [{ messageId: 'childProcessCommandInjection' }],
    },
    {
      // FN GUARD: found while checking `node --help` for this review — -p
      // evaluates and prints, and was missing from the original flag list.
      name: 'node -p evaluates and prints',
      code: `const { execFileSync } = require('child_process'); execFileSync('node', ['-p', x]);`,
      errors: [{ messageId: 'childProcessCommandInjection' }],
    },
    {
      // FN GUARD: perl -E is -e with feature bundles enabled. Also missing.
      name: 'perl -E is -e with features enabled',
      code: `const { execFileSync } = require('child_process'); execFileSync('perl', ['-E', x]);`,
      errors: [{ messageId: 'childProcessCommandInjection' }],
    },
    {
      // FN GUARD: python's own eval flag still reports.
      name: 'python -c runs code',
      code: `const { execFileSync } = require('child_process'); execFileSync('python3', ['-c', x]);`,
      errors: [{ messageId: 'childProcessCommandInjection' }],
    },
    {
      // FN GUARD for the narrowing: a binary we cannot NAME could be a shell,
      // so the flag keeps its conservative reading. Suppressing here would let
      // `execFileSync(userShell, ['-c', cmd])` through.
      name: 'an unnameable binary keeps the conservative reading',
      code: `const { execFileSync } = require('child_process'); execFileSync(bin, ['-c', name]);`,
      errors: [{ messageId: 'childProcessCommandInjection' }],
    },
  ],
});

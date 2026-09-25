/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock: no rule in this plugin reports on code that is not a
 * command of a proven CLI host.
 *
 * `.command()`, `.action()`, `.description()`, `.example()` and a `text()` call
 * are ordinary names. Routers, job queues, ORMs and test doubles own every one
 * of them, so a rule that matched them without provenance would report on code
 * that has never seen commander, yargs or burgee. "Did not happen to fire" is
 * not "cannot".
 *
 * The receiver gate is what holds it: a call only counts when the object it is
 * made on resolves, by binding, to the host's export. The second group below
 * imports the host and calls the method on something else — deleting the
 * provenance check in `utils/hosts.ts` turns those cases red (verified by
 * mutation). The per-file import gate (`utils/evidence.ts`) is only an early
 * exit for speed; with it forced open this suite still passes, which is the
 * point — precision never depends on it.
 *
 * Written over the whole rule registry rather than per rule, so a rule added
 * later is covered the day it lands.
 */
import parser from '@typescript-eslint/parser';
import type { ESLint } from 'eslint';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import plugin, { rules } from './index';

const RULES = Object.keys(rules);

/**
 * One file that violates all four rules at once, on the commander host. It
 * appears with its import (must report, once per rule) and without (must not):
 * one fixture proving both directions is what stops this suite passing with the
 * gate shut on everything.
 */
const HOST = "import { Command } from 'commander';";
const PROMPT = "import { text } from '@clack/prompts';";
const VIOLATION = `const program = new Command();
program.command('build').action(async () => {
  console.log('building');
  await text({ message: 'Name?' });
});
bus.example('two\\nlines');`;

/** Code that owns every matching name and uses no CLI host. */
const NOT_A_HOST: ReadonlyArray<readonly [string, string]> = [
  ['the violation itself, minus the host import', `${PROMPT}\n${VIOLATION}`],
  [
    'a job queue whose .command() / .action() log to the console',
    `${PROMPT}
     export const queue = makeQueue();
     queue.command('email').description('').action(async (job) => {
       console.log(job);
       await text({ message: 'retry?' });
     });`,
  ],
  [
    'a local class called Command with a builder API',
    `class Command { command() { return this; } action(f) { f(); return this; } }
     new Command().command('x').action(() => console.log('x'));`,
  ],
  [
    'a docs generator that owns .example()',
    `export const doc = { example: (s) => s };
     doc.example('line one\\nline two');`,
  ],
];

/** The host is imported; the receiver is not the host's. */
const HOST_BUT_NOT_THE_RECEIVER: ReadonlyArray<readonly [string, string]> = [
  [
    'commander imported, .command() called on a router',
    `${HOST}\n${PROMPT}
     router.command('build').action(async () => {
       console.log('x');
       await text({ message: 'Name?' });
     });`,
  ],
  [
    'yargs imported, .command() called on a bus',
    `import yargs from 'yargs';
     bus.command('serve', undefined, () => {}, () => { console.log('x'); });
     bus.example('a\\nb');`,
  ],
  [
    'burgee imported, a local defineCommand',
    `import 'burgee';
     const defineCommand = (c) => c;
     defineCommand({ name: 'x', run: () => { console.log('x'); } });`,
  ],
];

const lint = (code: string, rule: string): Linter.LintMessage[] => {
  // `configType: 'flat'` because a bare `new Linter()` still defaults to
  // eslintrc on the declared ESLint floor, which would ignore the config below
  // and skip every rule — a suite that passes having run nothing.
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(
    code,
    {
      files: ['**/*.ts'],
      languageOptions: {
        parser: parser as unknown as Linter.Parser,
        parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      },
      plugins: { c: plugin as unknown as ESLint.Plugin },
      rules: { [`c/${rule}`]: 'error' },
    },
    // Without a filename the Linter lints `<input>`, which matches no `files`
    // entry — every rule skipped, every negative below vacuously true.
    'sample.ts',
  );
};

describe('CLI host gate', () => {
  it('the registry is non-empty, so the sweep below is not vacuous', () => {
    expect(RULES.length).toBeGreaterThan(0);
  });

  describe.each([...NOT_A_HOST, ...HOST_BUT_NOT_THE_RECEIVER])(
    '%s',
    (_name, code) => {
      it.each(RULES)('%s reports nothing', (rule) => {
        const messages = lint(code, rule);
        // A parse or config error also yields zero *rule* findings, so it is
        // asserted away rather than counted as a pass.
        expect(messages.filter((m) => !m.ruleId)).toHaveLength(0);
        expect(messages.map((m) => m.ruleId)).toEqual([]);
      });
    },
  );

  describe('positive control — the gate opens for a real commander program', () => {
    it.each(RULES.filter((rule) => rule !== 'require-command-example'))(
      '%s reports on the violation once the host is imported',
      (rule) => {
        expect(
          lint(`${HOST}\n${PROMPT}\n${VIOLATION}`, rule).map((m) => m.ruleId),
        ).toEqual([`c/${rule}`]);
      },
    );

    it('require-command-example reports the missing example, and not the unrelated .example()', () => {
      const messages = lint(
        `${HOST}\n${PROMPT}\n${VIOLATION}`,
        'require-command-example',
      );
      expect(messages.map((m) => m.messageId)).toEqual(['missingExample']);
    });
  });
});

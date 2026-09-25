/**
 * @fileoverview Tests for no-prompt-without-flag
 *
 * Every accepted guard shape has a valid case, and each has a near-miss that
 * still reports — a guard on something that is not the handler's input is not
 * a flag. The traps: a prompt outside any handler, a same-named function from
 * a non-prompt module, and a program that imports no CLI host.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noPromptWithoutFlag } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const COMMANDER = `import { Command } from 'commander';\nconst program = new Command();`;
const CLACK = `import { text, confirm } from '@clack/prompts';`;
const YARGS = `import yargs from 'yargs';\nimport { hideBin } from 'yargs/helpers';`;

ruleTester.run('no-prompt-without-flag', noPromptWithoutFlag, {
  valid: [
    {
      name: 'a ?? fallback from the options parameter',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').option('--name <n>').action(async (opts) => { const name = opts.name ?? await text({ message: 'Name?' }); });`,
    },
    {
      name: 'a guarded if on a destructured option',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async ({ name }) => { let n = name; if (!n) n = await text({ message: 'Name?' }); });`,
    },
    {
      name: 'a conditional on the --yes flag',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('rm').action(async (opts) => { const ok = opts.yes ? true : await confirm({ message: 'Sure?' }); });`,
    },
    {
      name: 'an early return on the flag before the prompt',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('rm').action(async (opts) => { if (opts.yes) return remove(); await confirm({ message: 'Sure?' }); });`,
    },
    {
      name: 'a destructuring default in the parameter',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async ({ name = await text({ message: 'Name?' }) }) => {});`,
    },
    {
      name: 'a destructuring default from a local read of the options',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async (opts) => { const { name = await text({ message: 'Name?' }) } = opts; });`,
    },
    {
      name: 'commander: this.opts() in a function handler',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async function () { const o = this.opts(); if (!o.name) await text({ message: 'Name?' }); });`,
    },
    {
      name: 'commander: program.opts() read inside the handler',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async () => { const o = program.opts(); return o.name ?? await text({ message: 'Name?' }); });`,
    },
    {
      name: 'inquirer: prefilled answers from the options skip the questions',
      code: `${COMMANDER}\nimport inquirer from 'inquirer';\nprogram.command('init').action(async (opts) => { await inquirer.prompt([{ name: 'name' }], { name: opts.name }); });`,
    },
    {
      name: 'inquirer: a when gate reading the options',
      code: `${COMMANDER}\nimport inquirer from 'inquirer';\nprogram.command('init').action(async (opts) => { await inquirer.prompt([{ name: 'name', when: () => !opts.name }]); });`,
    },
    {
      name: 'caique: decide() on the flag value gates ask()',
      code: `${COMMANDER}\nimport { ask } from 'caique/ask';\nimport { decide } from 'caique/decide';\nprogram.command('init').action(async (opts) => { const v = decide({ value: opts.name }); if (v.action === 'prompt') await ask({ kind: 'text', message: 'Name?' }); });`,
    },
    {
      name: 'yargs: argv guards the prompt',
      code: `${YARGS}\n${CLACK}\nyargs(hideBin(process.argv)).command('init', 'Init', () => {}, async (argv) => { const n = argv.name || await text({ message: 'Name?' }); });`,
    },
    {
      name: 'burgee: options destructured from the context',
      code: `import { defineCommand } from 'burgee';\n${CLACK}\ndefineCommand({ name: 'init', run: async ({ options }) => options.name ?? await text({ message: 'Name?' }) });`,
    },
    {
      name: 'an early exit written as a block that ends in return',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('rm').action(async (opts) => { if (opts.yes) { remove(); return; } await confirm({ message: 'Sure?' }); });`,
    },
    {
      name: 'an early throw on the flag',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('rm').action(async (opts) => { if (opts.ci) throw new Error('pass --yes'); await confirm({ message: 'Sure?' }); });`,
    },
    {
      name: 'a computed read keyed by an option',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async (opts) => { const v = cache[opts.key] ?? await text({ message: 'Value?' }); });`,
    },
    {
      name: 'a default in the handler’s own positional parameter',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init [name]').action(async (name = await text({ message: 'Name?' })) => {});`,
    },
    {
      name: 'an array destructuring default in the parameter',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async ([first = await text({ message: 'Name?' })]) => {});`,
    },
    {
      name: 'a destructuring assignment from the options',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async (opts) => { let name; ({ name = await text({ message: 'Name?' }) } = opts); });`,
    },
    {
      name: 'inquirer: a when gate written as a boolean',
      code: `${COMMANDER}\nimport inquirer from 'inquirer';\nprogram.command('init').action(async (opts) => { await inquirer.prompt([{ name: 'name', when: !opts.name }]); });`,
    },
    {
      name: 'prompts via its prompt export, guarded',
      code: `${COMMANDER}\nimport { prompt } from 'prompts';\nprogram.command('init').action(async (opts) => opts.name ?? (await prompt({ type: 'text', name: 'n' })).n);`,
    },
    {
      name: 'a prompt outside any command handler is not command code',
      code: `${COMMANDER}\n${CLACK}\nawait text({ message: 'Name?' });`,
    },
    {
      name: 'a same-named text() from a non-prompt module',
      code: `${COMMANDER}\nimport { text } from './strings.js';\nprogram.command('x').action(async () => { await text('hi'); });`,
    },
    {
      name: 'a local function called confirm',
      code: `${COMMANDER}\nconst confirm = () => true;\nprogram.command('x').action(() => { confirm(); });`,
    },
    {
      name: 'no CLI host import — a prompt in some other callback',
      code: `${CLACK}\nqueue.action(async () => { await text({ message: 'Name?' }); });`,
    },
  ],
  invalid: [
    {
      name: 'commander: an unconditional text()',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async () => { const name = await text({ message: 'Name?' }); });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'a ?? fallback on something that is not the handler’s input',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async () => { const name = config.name ?? await text({ message: 'Name?' }); });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'the prompt is on the left of ??, so it always runs',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async (opts) => { const name = (await text({ message: 'Name?' })) ?? opts.name; });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'an earlier if on the flag that does not exit does not skip the prompt',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('rm').action(async (opts) => { if (opts.verbose) log(); await confirm({ message: 'Sure?' }); });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'the input read happens inside a nested callback, not the test',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async (opts) => { if (check(() => opts.name)) await text({ message: 'Name?' }); });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'a key spelled like a parameter is not a read of it',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async (name) => { if (!settings.name) await text({ message: 'Name?' }); });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'a parameter of a nested function is not the handler’s input',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async () => { await Promise.all(list.map(async (x) => x.ok || await text({ message: 'Name?' }))); });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'an early if whose block does not exit',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('rm').action(async (opts) => { if (opts.yes) { log(); } await confirm({ message: 'Sure?' }); });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'an early if with an empty block',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('rm').action(async (opts) => { if (opts.yes) {} await confirm({ message: 'Sure?' }); });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'a destructuring default from something that is not the input',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async () => { const { name = await text({ message: 'Name?' }) } = config; });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'a default inside a catch binding is not a flag',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async (opts) => { try { run(opts); } catch ({ message = await text({ message: 'Why?' }) }) {} });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'a parameter default on a nested function is not the handler’s',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async () => { const ask = async (v = await text({ message: 'Name?' })) => v; });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'this in an arrow handler is not the command',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async () => { if (!this.name) await text({ message: 'Name?' }); });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'this inside a nested function is that function’s',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async function () { function inner() { return this.x; } if (inner()) await text({ message: 'Name?' }); });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'a self-referential local does not loop and is not input',
      code: `${COMMANDER}\n${CLACK}\nprogram.command('init').action(async () => { const a = b; const b = a; if (a) await text({ message: 'Name?' }); });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'inquirer: questions held in a variable carry no visible gate',
      code: `${COMMANDER}\nimport inquirer from 'inquirer';\nprogram.command('init').action(async () => { await inquirer.prompt(QUESTIONS); });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'inquirer: the namespace default.prompt, from the caique drop-in',
      code: `${COMMANDER}\nimport * as inq from 'caique/inquirer';\nprogram.command('init').action(async () => { await inq.default.prompt([{ name: 'n', when: true }]); });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'inquirer.prompt with no prefill',
      code: `${COMMANDER}\nimport inquirer from 'inquirer';\nprogram.command('init').action(async () => { await inquirer.prompt([{ name: 'name' }]); });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: '@inquirer/prompts input()',
      code: `${COMMANDER}\nimport { input } from '@inquirer/prompts';\nprogram.command('init').action(async () => { await input({ message: 'Name?' }); });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: '@inquirer/confirm default export',
      code: `${COMMANDER}\nimport confirm from '@inquirer/confirm';\nprogram.command('rm').action(async () => { await confirm({ message: 'Sure?' }); });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'prompts default export',
      code: `${YARGS}\nimport prompts from 'prompts';\nyargs(hideBin(process.argv)).command('init', 'Init', () => {}, async () => { await prompts({ type: 'text', name: 'n' }); });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'enquirer prompt via require',
      code: `${COMMANDER}\nconst { prompt } = require('enquirer');\nprogram.command('init').action(async () => { await prompt({ type: 'input', name: 'n' }); });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'burgee + caique ask() with no flag',
      code: `import { defineCommand } from 'burgee';\nimport { ask } from 'caique';\ndefineCommand({ name: 'init', run: async () => ask({ kind: 'text', message: 'Name?' }) });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
    {
      name: 'caique/clack drop-in, renamed to foo',
      code: `${COMMANDER}\nimport { text as foo } from 'caique/clack';\nprogram.command('bar').action(async () => { await foo({ message: 'baz' }); });`,
      errors: [{ messageId: 'promptWithoutFlag' }],
    },
  ],
});

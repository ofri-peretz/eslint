/**
 * @fileoverview Tests for require-command-description
 *
 * Per host: a described command is quiet, an undescribed one reports. The
 * traps are the point — `.command()` and `.description()` on something that is
 * not a CLI host (an ORM, a router, a local class named `Command`) must never
 * report, and neither must a description the AST cannot read.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';

import { requireCommandDescription } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const COMMANDER = `import { Command } from 'commander';\nconst program = new Command();`;
const YARGS = `import yargs from 'yargs';\nimport { hideBin } from 'yargs/helpers';`;
const BURGEE = `import { defineCommand, defineProgram } from 'burgee';`;

ruleTester.run('require-command-description', requireCommandDescription, {
  valid: [
    // --- commander ---------------------------------------------------------
    {
      name: 'commander: a subcommand with .description()',
      code: `${COMMANDER}\nprogram.command('build').description('Build the site').action(() => {});`,
    },
    {
      name: 'commander: .summary() describes it too',
      code: `${COMMANDER}\nprogram.command('build').summary('Build the site').action(() => {});`,
    },
    {
      name: 'commander: the description set in a later statement on the same variable',
      code: `${COMMANDER}\nconst build = program.command('build');\nbuild.action(() => {});\nbuild.description('Build the site');`,
    },
    {
      name: 'commander: an executable subcommand carries its description in the call',
      code: `${COMMANDER}\nprogram.command('install [pkg]', 'Install a package');`,
    },
    {
      name: 'commander: a hidden subcommand is not in help',
      code: `${COMMANDER}\nprogram.command('debug', { hidden: true }).action(() => {});`,
    },
    {
      name: 'commander: a description held in a variable is unreadable, not absent',
      code: `${COMMANDER}\nprogram.command('build').description(TEXT).action(() => {});`,
    },
    {
      name: 'commander: a root program with only subcommands is a dispatcher, not checked',
      code: `${COMMANDER}\nprogram.name('tool');\nprogram.command('build').description('Build').action(() => {});`,
    },
    {
      name: 'commander: the pre-v12 default export is the program, described',
      code: `const program = require('commander');\nprogram.description('A tool').action(() => {});`,
    },
    {
      name: 'burgee/commander is the same API and is read the same way',
      code: `import { program } from 'burgee/commander';\nprogram.command('build').description('Build').action(() => {});`,
    },
    // --- yargs -------------------------------------------------------------
    {
      name: 'yargs: the description is the second argument',
      code: `${YARGS}\nyargs(hideBin(process.argv)).command('serve', 'Start the server', () => {}, () => {}).parse();`,
    },
    {
      name: 'yargs: the object form with describe',
      code: `${YARGS}\nyargs(hideBin(process.argv)).command({ command: 'serve', describe: 'Start the server', handler() {} });`,
    },
    {
      name: 'yargs: describe: false hides the command',
      code: `${YARGS}\nyargs(hideBin(process.argv)).command('secret', false, () => {}, () => {});`,
    },
    {
      name: 'yargs: a command module imported from another file cannot be read',
      code: `${YARGS}\nimport serve from './serve.js';\nyargs(hideBin(process.argv)).command(serve);`,
    },
    {
      name: 'yargs: a spread in the object form may carry the description',
      code: `${YARGS}\nyargs(hideBin(process.argv)).command({ ...base, command: 'serve', handler() {} });`,
    },
    // --- burgee ------------------------------------------------------------
    {
      name: 'burgee: defineCommand with a description',
      code: `${BURGEE}\ndefineCommand({ name: 'greet', description: 'Greet someone', run: () => ({}) });`,
    },
    {
      name: 'burgee: defineProgram itself is a container, not a command',
      code: `${BURGEE}\ndefineProgram({ name: 'tool', commands: [] });`,
    },
    {
      name: 'burgee: a spread may carry the description',
      code: `${BURGEE}\ndefineCommand({ ...shared, name: 'greet', run: () => ({}) });`,
    },
    // --- how far the model follows a chain --------------------------------
    {
      name: 'a reassigned binding may hold something else by the time it is used',
      code: `${COMMANDER}\nlet build = new Command('build');\nbuild = other;\nbuild.action(() => {});`,
    },
    {
      name: 'a binding with no initializer is not a command',
      code: `${COMMANDER}\nlet build;\nbuild.action(() => {});`,
    },
    {
      name: 'a binding that refers to itself does not loop',
      code: `${COMMANDER}\nconst build = build.command('b');\nbuild.action(() => {});`,
    },
    {
      name: 'another commander export is not a command',
      code: `import { Option } from 'commander';\nOption.action(() => {});`,
    },
    {
      name: 'a member of an unrelated object is not a command',
      code: `${COMMANDER}\nctx.cli.command('build').action(() => {});`,
    },
    {
      name: 'a computed method name cannot be read',
      code: `${COMMANDER}\nprogram[method]('build').action(() => {});`,
    },
    {
      name: 'a second .command() argument held in a variable is unreadable',
      code: `${COMMANDER}\nprogram.command('build', OPTIONS).action(() => {});`,
    },
    {
      name: 'an unknown method ends the chain rather than being guessed through',
      code: `${COMMANDER}\nprogram.command('build').description('Build').helpInformation().action(() => {});`,
    },
    {
      name: 'an unreadable summary does not erase a description either',
      code: `${COMMANDER}\nprogram.command('build').summary(TEXT).description('Build').action(() => {});`,
    },
    {
      name: 'an empty summary does not erase a description',
      code: `${COMMANDER}\nprogram.command('build').description('Build').summary('').action(() => {});`,
    },
    {
      name: 'addCommand of a command imported from another file',
      code: `${COMMANDER}\nimport build from './build.js';\nprogram.addCommand(build);`,
    },
    {
      name: 'yargs: a command name held in a variable in the object form',
      code: `${YARGS}\nyargs(hideBin(process.argv)).command({ command: NAME, describe: 'Serve', handler() {} });`,
    },
    {
      name: 'yargs: an alias list with a description',
      code: `${YARGS}\nyargs(hideBin(process.argv)).command(['serve', 's'], 'Start', () => {}, () => {});`,
    },
    {
      name: 'yargs: .command() with no arguments registers nothing',
      code: `${YARGS}\nyargs().command();`,
    },
    {
      name: 'yargs: a second argument that is a builder is an older overload, unread',
      code: `${YARGS}\nyargs().command('serve', (y) => y, () => {});`,
    },
    {
      name: 'yargs: an instance from a local factory is not proven',
      code: `${YARGS}\nmakeCli().command('serve').parse();`,
    },
    {
      name: 'yargs: a parameter of an ordinary function is not an instance',
      code: `${YARGS}\nfunction setup(y) { return y.command('serve'); }`,
    },
    {
      name: 'yargs: a builder’s second parameter is not the instance it is handed',
      code: `${YARGS}\nyargs().command('remote', 'Remotes', (y, z) => z.command('add'), () => {});`,
    },
    {
      name: 'yargs: a binding that refers to itself does not loop',
      code: `${YARGS}\nconst y = y.command('serve');`,
    },
    {
      name: 'burgee: a command object built elsewhere is not read',
      code: `${BURGEE}\ndefineCommand(spec);\ndefineProgram({ name: 'tool', commands: [greet] });`,
    },
    {
      name: 'burgee: a computed key may be the description',
      code: `${BURGEE}\ndefineCommand({ [KEY]: 'x', name: 'greet', run() {} });`,
    },
    {
      name: 'a parameter typed with another commander export is not a command',
      code: `import { type OptionValues } from 'commander';\nexport function run(opts: OptionValues) { opts.command('x').action(() => {}); }`,
    },
    {
      name: 'a parameter typed with a local Command type is not commander’s',
      code: `import 'commander';\ntype Command = { command(n: string): Command; action(f: () => void): Command };\nexport function run(p: Command) { p.command('x').action(() => {}); }`,
    },
    {
      name: 'yargs: a parameter typed with another yargs export is not an instance',
      code: `import { type Arguments } from 'yargs';\nexport function run(a: Arguments) { a.command('serve'); }`,
    },
    {
      name: 'a computed destructuring key that is not a static string',
      code: `const { [key]: foo } = require('commander');\nfoo.command('bar').action(() => {});`,
    },
    {
      name: 'a computed destructuring key off something that is not a module',
      code: `const { ['program']: foo } = makeCli();\nfoo.command('bar').action(() => {});`,
    },
    {
      name: 'nested destructuring is not followed',
      code: `const { program: { cmd: foo } } = require('commander');\nfoo.command('bar').action(() => {});`,
    },
    // --- not a CLI host ----------------------------------------------------
    {
      name: 'no CLI import at all — a router with .command() and .action()',
      code: `router.command('build').action(() => {});`,
    },
    {
      name: 'commander imported, but the receiver is a local class named Command',
      code: `import 'commander';\nclass Command { command() { return this; } action() { return this; } }\nnew Command().command('build').action(() => {});`,
    },
    {
      name: 'yargs imported, but .command() is called on an unrelated object',
      code: `${YARGS}\nbus.command('serve', undefined, () => {}, () => {});`,
    },
    {
      name: 'burgee imported, but a local defineCommand is not burgee’s',
      code: `import 'burgee';\nfunction defineCommand(x) { return x; }\ndefineCommand({ name: 'x', run() {} });`,
    },
  ],
  invalid: [
    {
      name: 'commander: a subcommand with no description',
      code: `${COMMANDER}\nprogram.command('build').action(() => {});`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'commander: an empty description is no description',
      code: `${COMMANDER}\nprogram.command('build').description('  ').action(() => {});`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'commander: a root program that runs and says nothing',
      code: `${COMMANDER}\nprogram.option('-v').action(() => {});`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'commander: new Command added with addCommand',
      code: `${COMMANDER}\nconst build = new Command('build').action(() => {});\nprogram.addCommand(build);`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'commander: createCommand() and the extra-typings drop-in',
      code: `import { createCommand } from '@commander-js/extra-typings';\ncreateCommand('build').action(() => {});`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'commander: the program export via require, renamed to foo',
      code: `const { program: foo } = require('commander');\nfoo.command('bar').action(() => {});`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'a TypeScript cast does not hide the receiver',
      code: `${COMMANDER}\n(program as Command).command('build')!.action(() => {});`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'a no-argument toggle continues the chain',
      code: `${COMMANDER}\nprogram.command('build').allowUnknownOption().action(() => {});`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'the .description() getter is not a description',
      code: `${COMMANDER}\nconst build = program.command('build');\nbuild.description();\nbuild.action(() => {});`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'an executable subcommand returns the parent, so the next .command() is a sibling',
      code: `${COMMANDER}\nprogram.command('install', 'Install').command('build').action(() => {});`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'yargs: the pre-v18 singleton straight off require',
      code: `const yargs = require('yargs');\nyargs.command('serve').argv;`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'yargs: the object form without a command key still needs describe',
      code: `${YARGS}\nyargs().command({ handler() {} });`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'commander: a program handed in as a parameter typed Command',
      code: `import type { Command } from 'commander';\nexport function register(program: Command) { program.command('build').action(() => {}); }`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'yargs: an instance handed in as a parameter typed Argv',
      code: `import { type Argv } from 'yargs';\nexport function buildCli(y: Argv) { return y.command('serve').strict(); }`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'commander: a computed destructuring key names the export as the dotted one does',
      code: `const { ['program']: foo } = require('commander');\nfoo['command']('bar').action(() => {});`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'yargs: a positional command with no description',
      code: `${YARGS}\nyargs(hideBin(process.argv)).command('serve').parse();`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'yargs: the object form with no describe',
      code: `${YARGS}\nyargs(hideBin(process.argv)).command({ command: 'serve', handler() {} });`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'yargs: a nested command registered inside a builder',
      code: `${YARGS}\nyargs(hideBin(process.argv)).command('remote', 'Manage remotes', (y) => y.command('add'), () => {});`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'burgee/yargs drop-in, instance held in a variable',
      code: `import yargs from 'burgee/yargs';\nconst cli = yargs(process.argv.slice(2));\ncli.command('serve', '', () => {}, () => {});`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'burgee: defineCommand with no description',
      code: `${BURGEE}\ndefineCommand({ name: 'greet', run: () => ({}) });`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'burgee: a child in defineProgram commands with no description',
      code: `${BURGEE}\ndefineProgram({ name: 'tool', description: 'A tool', commands: [{ name: 'greet', run() {} }] });`,
      errors: [{ messageId: 'missingDescription' }],
    },
    {
      name: 'burgee/plugin: a contributed command with no description',
      code: `import { definePlugin } from 'burgee/plugin';\ndefinePlugin({ name: 'acme', commands: [{ path: ['audit'], run: () => ({}) }] });`,
      errors: [{ messageId: 'missingDescription' }],
    },
  ],
});

/**
 * @fileoverview Tests for no-console-in-command
 *
 * A `console.*` call reports only when it is lexically inside a handler whose
 * host is proven by import. The traps: `console` at module scope, in a helper
 * defined outside the handler, in a program that imports no CLI host, and a
 * local binding that happens to be called `console`.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noConsoleInCommand } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const COMMANDER = `import { Command } from 'commander';\nconst program = new Command();`;
const YARGS = `import yargs from 'yargs';\nimport { hideBin } from 'yargs/helpers';`;
const BURGEE = `import { defineCommand } from 'burgee';`;

ruleTester.run('no-console-in-command', noConsoleInCommand, {
  valid: [
    {
      name: 'commander: the handler returns and writes through an output module',
      code: `${COMMANDER}\nimport { out } from './output.js';\nprogram.command('build').action(() => { out.write('done'); });`,
    },
    {
      name: 'console at module scope is not command code',
      code: `${COMMANDER}\nconsole.log('starting');\nprogram.command('build').action(() => {});`,
    },
    {
      name: 'a helper defined outside the handler is not followed',
      code: `${COMMANDER}\nfunction report() { console.log('x'); }\nprogram.command('build').action(() => { report(); });`,
    },
    {
      name: 'a local binding named console is somebody’s logger',
      code: `${COMMANDER}\nprogram.command('build').action(() => { const console = makeLogger(); console.log('x'); });`,
    },
    {
      name: 'a hook is not a handler',
      code: `${COMMANDER}\nprogram.hook('preAction', () => { console.error('about to run'); });`,
    },
    {
      name: 'yargs: console in the builder, not the handler',
      code: `${YARGS}\nyargs(hideBin(process.argv)).command('serve', 'Start', (y) => { console.log('building'); return y; }, () => {});`,
    },
    {
      name: 'burgee: run returns data',
      code: `${BURGEE}\ndefineCommand({ name: 'greet', run: ({ options }) => ({ greeting: options.name }) });`,
    },
    {
      name: 'a handler read off another object is not followed',
      code: `${COMMANDER}\nconsole.log('start');\nprogram.command('build').action(handlers.build);`,
    },
    {
      name: 'a handler held in a const that is not a function literal',
      code: `${COMMANDER}\nconst build = makeHandler(() => console.log('x'));\nprogram.command('build').action(build);`,
    },
    {
      name: 'a burgee command passed by reference is not read',
      code: `${BURGEE}\ndefineCommand(spec);`,
    },
    {
      name: 'no CLI import — an Express-style .action() handler',
      code: `queue.action((job) => { console.log(job); });`,
    },
    {
      name: 'commander imported, but .action() on an unrelated receiver',
      code: `${COMMANDER}\nstore.action((x) => { console.log(x); });`,
    },
    {
      name: 'a function passed by name that is not a function in this file',
      code: `${COMMANDER}\nimport { build } from './build.js';\nprogram.command('build').action(build);`,
    },
  ],
  invalid: [
    {
      name: 'commander: console.log inside .action()',
      code: `${COMMANDER}\nprogram.command('build').description('Build').action(() => { console.log('built'); });`,
      errors: [{ messageId: 'consoleInCommand' }],
    },
    {
      name: 'commander: a handler declared in this file and passed by name',
      code: `${COMMANDER}\nfunction build() { console.error('x'); }\nprogram.command('build').action(build);`,
      errors: [{ messageId: 'consoleInCommand' }],
    },
    {
      name: 'commander: a handler held in a const arrow',
      code: `${COMMANDER}\nconst build = async () => { console.info('x'); };\nprogram.command('build').action(build);`,
      errors: [{ messageId: 'consoleInCommand' }],
    },
    {
      name: 'commander: nested callback inside the handler is still command code',
      code: `${COMMANDER}\nprogram.command('ls').action(() => { items.forEach((i) => console.log(i)); });`,
      errors: [{ messageId: 'consoleInCommand' }],
    },
    {
      name: 'yargs: console in the positional-form handler',
      code: `${YARGS}\nyargs(hideBin(process.argv)).command('serve', 'Start', () => {}, (argv) => { console.log(argv.port); }).parse();`,
      errors: [{ messageId: 'consoleInCommand' }],
    },
    {
      name: 'yargs: console in the object-form handler method',
      code: `${YARGS}\nyargs(hideBin(process.argv)).command({ command: 'serve', describe: 'Start', handler(argv) { console.table(argv); } });`,
      errors: [{ messageId: 'consoleInCommand' }],
    },
    {
      name: 'burgee: console in run',
      code: `${BURGEE}\ndefineCommand({ name: 'greet', run: ({ options }) => { console.log(options.name); } });`,
      errors: [{ messageId: 'consoleInCommand' }],
    },
    {
      name: 'two console calls in one handler report twice',
      code: `${COMMANDER}\nprogram.command('build').action(() => { console.log('a'); console.error('b'); });`,
      errors: [
        { messageId: 'consoleInCommand' },
        { messageId: 'consoleInCommand' },
      ],
    },
    {
      name: 'commander: a handler registered on a program typed Command',
      code: `import { Command } from 'commander';\nexport function register(program: Command) { program.command('b').action(() => { console.log('x'); }); }`,
      errors: [{ messageId: 'consoleInCommand' }],
    },
    {
      name: 'string subscripts and a computed destructuring key still report',
      code: `const { ['Command']: foo } = require('commander');\nconst bar = new foo();\nbar['command']('baz')['action'](() => { console['log']('qux'); });`,
      errors: [{ messageId: 'consoleInCommand' }],
    },
    {
      name: 'every identifier renamed: foo/bar/baz still report',
      code: `const { Command: foo } = require('commander');\nconst bar = new foo();\nbar.command('baz').action(function () { console.warn('qux'); });`,
      errors: [{ messageId: 'consoleInCommand' }],
    },
  ],
});

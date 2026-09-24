/**
 * @fileoverview Tests for require-command-example
 *
 * Two findings: a runnable command with no example, and an example that is
 * not one line. Groups (no handler) and hidden commands are exempt from the
 * first; an example the AST cannot read is never guessed at.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';

import { requireCommandExample } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const COMMANDER = `import { Command } from 'commander';\nconst program = new Command();`;
const YARGS = `import yargs from 'yargs';\nimport { hideBin } from 'yargs/helpers';`;
const BURGEE = `import { defineCommand, defineProgram } from 'burgee';`;

ruleTester.run('require-command-example', requireCommandExample, {
  valid: [
    // --- commander ---------------------------------------------------------
    {
      name: 'commander: addHelpText after the command',
      code: `${COMMANDER}\nprogram.command('build').description('Build').addHelpText('after', '\\nExample:\\n  $ tool build').action(() => {});`,
    },
    {
      name: 'commander: an afterAll on the parent reaches every subcommand',
      code: `${COMMANDER}\nprogram.addHelpText('afterAll', 'Examples: …');\nprogram.command('build').action(() => {});`,
    },
    {
      name: 'commander: a grandparent afterAll reaches through a group',
      code: `${COMMANDER}\nprogram.addHelpText('afterAll', 'Examples: …');\nconst remote = program.command('remote');\nremote.command('add').action(() => {});`,
    },
    {
      name: 'commander: a group with no action needs no example of its own',
      code: `${COMMANDER}\nconst remote = program.command('remote').description('Remotes');\nremote.command('add').addHelpText('after', 'Example: tool remote add x').action(() => {});`,
    },
    {
      name: 'commander: a hidden command is not in help',
      code: `${COMMANDER}\nprogram.command('debug', { hidden: true }).action(() => {});`,
    },
    {
      name: 'commander: a hidden command added with addCommand',
      code: `${COMMANDER}\nprogram.addCommand(new Command('debug').action(() => {}), { hidden: true });`,
    },
    // --- yargs -------------------------------------------------------------
    {
      name: 'yargs: .example() inside the command builder',
      code: `${YARGS}\nyargs(hideBin(process.argv)).command('serve', 'Start', (y) => y.example('$0 serve --port 80', 'on port 80'), () => {});`,
    },
    {
      name: 'yargs: a builder written as a block that returns the chain',
      code: `${YARGS}\nyargs(hideBin(process.argv)).command('serve', 'Start', function (y) { return y.option('port').example('$0 serve', 'start'); }, () => {});`,
    },
    {
      name: 'yargs: the object form with a builder that has an example',
      code: `${YARGS}\nyargs(hideBin(process.argv)).command({ command: 'serve', describe: 'Start', builder: (y) => y.example([['$0 serve', 'start']]), handler() {} });`,
    },
    {
      name: 'yargs: root examples render on the default command',
      code: `${YARGS}\nyargs(hideBin(process.argv)).command('$0 <file>', 'Lint a file', () => {}, () => {}).example('$0 index.js', 'lint one file').parse();`,
    },
    {
      name: 'yargs: a registration without a handler is a group',
      code: `${YARGS}\nyargs(hideBin(process.argv)).command('remote', 'Manage remotes');`,
    },
    // --- burgee ------------------------------------------------------------
    {
      name: 'burgee: an examples array with one line',
      code: `${BURGEE}\ndefineCommand({ name: 'greet', description: 'Greet', examples: [{ command: 'tool greet --name ada' }], run: () => ({}) });`,
    },
    {
      name: 'burgee: examples held in a variable are unreadable, not absent',
      code: `${BURGEE}\ndefineCommand({ name: 'greet', examples: EXAMPLES, run: () => ({}) });`,
    },
    {
      name: 'burgee: a group with commands and no run',
      code: `${BURGEE}\ndefineCommand({ name: 'remote', description: 'Remotes', commands: [] });`,
    },
    {
      name: 'burgee: an interpolated template on one line is one line',
      code: `${BURGEE}\ndefineCommand({ name: 'greet', examples: [{ command: \`\${bin} greet\` }], run() {} });`,
    },
    {
      name: 'yargs: an example held in a variable is not read as multi-line',
      code: `${YARGS}\nyargs().example(EXAMPLE, 'x');`,
    },
    {
      name: 'yargs: an array-form entry that is not a pair is not read',
      code: `${YARGS}\nyargs().example([PAIR, , ['$0 ok', 'fine']]);`,
    },
    {
      name: 'burgee: an example entry built elsewhere is not read',
      code: `${BURGEE}\ndefineCommand({ name: 'greet', examples: [GREET_EXAMPLE], run() {} });`,
    },
    {
      name: 'commander: a cycle of addCommand is walked once',
      code: `${COMMANDER}\nconst a = new Command('a').description('A').addHelpText('after', 'x').action(() => {});\nconst b = new Command('b').description('B').addHelpText('after', 'y').action(() => {});\na.addCommand(b);\nb.addCommand(a);`,
    },
    {
      name: 'yargs: a builder whose parameter is typed Argv still owns its example',
      code: `import yargs, { type Argv } from 'yargs';\nyargs().command('serve', 'Start', (cmd: Argv) => cmd.example('$0 serve', 'start'), () => {});`,
    },
    {
      name: 'yargs: a builder imported from another file may hold the example',
      code: `${YARGS}\nimport { builder, handler } from './serve.js';\nyargs().command('serve', 'Start', builder, handler);`,
    },
    {
      name: 'yargs: a spread in the object form may carry the builder',
      code: `${YARGS}\nyargs().command({ ...serveModule, command: 'serve', describe: 'Start' });`,
    },
    {
      name: 'yargs: an object-form builder that is not readable',
      code: `${YARGS}\nyargs().command({ command: 'serve', describe: 'Start', builder: makeBuilder(), handler() {} });`,
    },
    // --- not a CLI host ----------------------------------------------------
    {
      name: 'no CLI import — .action() on an event bus',
      code: `bus.command('build').action(() => {});`,
    },
    {
      name: 'yargs imported, .example() on something else with a multi-line string',
      code: `${YARGS}\ndocs.example('line one\\nline two');`,
    },
  ],
  invalid: [
    {
      name: 'commander: a runnable subcommand with no help text',
      code: `${COMMANDER}\nprogram.command('build').description('Build').action(() => {});`,
      errors: [{ messageId: 'missingExample' }],
    },
    {
      name: 'commander: a parent’s plain after text does not reach the child',
      code: `${COMMANDER}\nprogram.addHelpText('after', 'Examples: …');\nprogram.command('build').action(() => {});`,
      errors: [{ messageId: 'missingExample' }],
    },
    {
      name: 'commander: addHelpText with no text is not an example',
      code: `${COMMANDER}\nprogram.command('build').description('Build').addHelpText('after').action(() => {});`,
      errors: [{ messageId: 'missingExample' }],
    },
    {
      name: 'commander: a cycle with no help text anywhere reports both and terminates',
      code: `${COMMANDER}\nconst a = new Command('a').action(() => {});\nconst b = new Command('b').action(() => {});\na.addCommand(b);\nb.addCommand(a);`,
      errors: [
        { messageId: 'missingExample' },
        { messageId: 'missingExample' },
      ],
    },
    {
      name: 'yargs: an empty .example() is not an example',
      code: `${YARGS}\nyargs().command('serve', 'Start', (y) => y.example(), () => {});`,
      errors: [{ messageId: 'missingExample' }],
    },
    {
      name: 'yargs: an empty array form is not an example',
      code: `${YARGS}\nyargs().command('$0', 'Start', () => {}, () => {}).example([]);`,
      errors: [{ messageId: 'missingExample' }],
    },
    {
      name: 'yargs: a command registered on an instance typed Argv',
      code: `import { type Argv } from 'yargs';\nexport function buildCli(y: Argv) { return y.command('greet <name>', 'Greet', (c) => c, () => {}); }`,
      errors: [{ messageId: 'missingExample' }],
    },
    {
      name: 'yargs: a handler imported from another file still makes the command runnable',
      code: `${YARGS}\nimport { serve } from './serve.js';\nyargs().command('serve', 'Start', (y) => y.option('port', {}), serve);`,
      errors: [{ messageId: 'missingExample' }],
    },
    {
      name: 'yargs: an options-object builder holds no examples',
      code: `${YARGS}\nimport { serve } from './serve.js';\nyargs().command('serve', 'Start', { port: {} }, serve);`,
      errors: [{ messageId: 'missingExample' }],
    },
    {
      name: 'yargs: the object form with an imported handler and no builder',
      code: `${YARGS}\nimport { serve } from './serve.js';\nyargs().command({ command: 'serve', describe: 'Start', handler: serve });`,
      errors: [{ messageId: 'missingExample' }],
    },
    {
      name: 'yargs: a runnable command with no example',
      code: `${YARGS}\nyargs(hideBin(process.argv)).command('serve', 'Start', () => {}, () => {});`,
      errors: [{ messageId: 'missingExample' }],
    },
    {
      name: 'yargs: a root example does not belong to a named subcommand',
      code: `${YARGS}\nyargs(hideBin(process.argv)).example('$0 serve', 'start').command('serve', 'Start', () => {}, () => {});`,
      errors: [{ messageId: 'missingExample' }],
    },
    {
      name: 'yargs: an example command that spans two lines',
      code: `${YARGS}\nyargs(hideBin(process.argv)).command('serve', 'Start', (y) => y.example('$0 serve \\\\\\n  --port 80', 'x'), () => {});`,
      errors: [{ messageId: 'multilineExample' }],
    },
    {
      name: 'yargs: a two-line example in the array form',
      code: `${YARGS}\nyargs(hideBin(process.argv)).example([['$0 a\\n$0 b', 'two commands']]);`,
      errors: [{ messageId: 'multilineExample' }],
    },
    {
      name: 'burgee: defineCommand with run and no examples',
      code: `${BURGEE}\ndefineCommand({ name: 'greet', description: 'Greet', run: () => ({}) });`,
      errors: [{ messageId: 'missingExample' }],
    },
    {
      name: 'burgee: an empty examples array',
      code: `${BURGEE}\ndefineCommand({ name: 'greet', examples: [], load: () => import('./greet.js') });`,
      errors: [{ messageId: 'missingExample' }],
    },
    {
      name: 'burgee: an example command with a line break in a template',
      code: `${BURGEE}\ndefineCommand({ name: 'greet', examples: [{ command: \`tool greet\n  --name ada\` }], run() {} });`,
      errors: [{ messageId: 'multilineExample' }],
    },
    {
      name: 'burgee: renamed import, child command in defineProgram',
      code: `import { defineProgram as foo } from 'burgee';\nfoo({ name: 'bar', commands: [{ name: 'baz', description: 'x', run() {} }] });`,
      errors: [{ messageId: 'missingExample' }],
    },
  ],
});

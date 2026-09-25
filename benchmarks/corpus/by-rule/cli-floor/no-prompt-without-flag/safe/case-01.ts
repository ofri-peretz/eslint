// cli-floor/no-prompt-without-flag — true negative
// @origin       rule-tests
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This must NOT be flagged by cli-floor/no-prompt-without-flag
import { text } from '@clack/prompts';
import { Command } from 'commander';

const program = new Command();
program
  .command('init')
  .description('Create a project')
  .addHelpText('after', '\nExample:\n  $ tool run')
  .option('--name <name>', 'project name')
  .action(async (opts) => opts.name ?? text({ message: 'Project name?' }));

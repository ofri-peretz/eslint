// cli-floor/no-prompt-without-flag — true positive
// @origin       rule-tests
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by cli-floor/no-prompt-without-flag
import { text } from '@clack/prompts';
import { Command } from 'commander';

const program = new Command();
program
  .command('init')
  .description('Create a project')
  .addHelpText('after', '\nExample:\n  $ tool run')
  .action(async () => {
    return text({ message: 'Project name?' });
  });

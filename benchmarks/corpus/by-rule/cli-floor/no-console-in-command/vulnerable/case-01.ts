// cli-floor/no-console-in-command — true positive
// @origin       rule-tests
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by cli-floor/no-console-in-command
import { Command } from 'commander';

const program = new Command();
program
  .command('build')
  .description('Build the site')
  .addHelpText('after', '\nExample:\n  $ tool run')
  .action(() => {
    console.log('built');
  });

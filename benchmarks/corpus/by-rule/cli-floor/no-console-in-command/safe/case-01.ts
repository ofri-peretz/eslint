// cli-floor/no-console-in-command — true negative
// @origin       rule-tests
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This must NOT be flagged by cli-floor/no-console-in-command
import { Command } from 'commander';
import { out } from './output.js';

const program = new Command();
program
  .command('build')
  .description('Build the site')
  .addHelpText('after', '\nExample:\n  $ tool run')
  .action(() => {
    out.write('built');
  });

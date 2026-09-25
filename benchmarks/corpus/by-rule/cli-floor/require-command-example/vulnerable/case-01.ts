// cli-floor/require-command-example — true positive
// @origin       rule-tests
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by cli-floor/require-command-example
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

yargs(hideBin(process.argv))
  .command('serve', 'Start the server', (y) => y.option('port', {}), serve)
  .parse();

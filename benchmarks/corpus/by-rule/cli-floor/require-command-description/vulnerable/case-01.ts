// cli-floor/require-command-description — true positive
// @origin       rule-tests
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by cli-floor/require-command-description
import { defineCommand } from 'burgee';

export const greet = defineCommand({
  name: 'greet',
  effects: 'read_only',
  examples: [{ command: 'tool greet --name ada' }],
  run: ({ options }) => ({ greeting: `hello, ${options.name}` }),
});

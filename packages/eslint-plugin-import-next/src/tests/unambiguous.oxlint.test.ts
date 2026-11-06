/**
 * unambiguous on oxlint. oxlint infers `sourceType` from the file's content,
 * so a file with no module syntax reports "script" — the very file this rule
 * exists to flag. ESLint's RuleTester cannot show that; oxlint's can.
 */
import { describe, it } from 'vitest';
import { RuleTester } from 'oxlint/plugins-dev';
import { unambiguous } from '../rules/unambiguous';

RuleTester.describe = describe;
RuleTester.it = it;
// Not `eslintCompat`: that mode pins sourceType to "module". The default,
// "unambiguous", is what the oxlint CLI does with a .js or .ts file.
const oxlint = new RuleTester();

oxlint.run('unambiguous', unambiguous as never, {
  valid: [
    { code: `import foo from 'foo';`, filename: 'a.js' },
    { code: `export const a = 1;`, filename: 'a.ts' },
    {
      code: `const a = require('./a'); module.exports = a;`,
      filename: 'config.cjs',
    },
  ],
  invalid: [
    {
      code: `const fs = require('fs');\nfs.readFileSync('a');`,
      filename: 'a.js',
      errors: [{ messageId: 'ambiguous' }],
    },
    {
      code: `const a = 1;\nconsole.log(a);`,
      filename: 'a.ts',
      errors: [{ messageId: 'ambiguous' }],
    },
  ],
});

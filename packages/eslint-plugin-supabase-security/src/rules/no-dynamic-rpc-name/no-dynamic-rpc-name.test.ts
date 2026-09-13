/**
 * @fileoverview Tests for no-dynamic-rpc-name
 *
 * Coverage intent: the fixed-string branches, the gate, and every early return —
 * plus the repo's litmus, that renaming every identifier changes nothing, since
 * the rule keys on the `.rpc` member and the argument's node type.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noDynamicRpcName } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const IMPORT = `import { createClient } from '@supabase/supabase-js';`;

ruleTester.run('no-dynamic-rpc-name', noDynamicRpcName, {
  valid: [
    {
      name: 'a literal name',
      code: `${IMPORT}\nawait db.rpc('get_profile', { id });`,
    },
    {
      name: 'a template literal with no interpolation is just as fixed',
      code: `${IMPORT}\nawait db.rpc(\`get_profile\`, { id });`,
    },
    { name: 'no arguments at all', code: `${IMPORT}\nawait db.rpc();` },
    {
      name: 'a spread is unreadable from here, not evidence',
      code: `${IMPORT}\nawait db.rpc(...args);`,
    },
    {
      name: 'a computed member is not `.rpc`',
      code: `${IMPORT}\nawait db[method]('x');`,
    },
    {
      name: 'a different method',
      code: `${IMPORT}\nawait db.from(table).select();`,
    },
    {
      name: 'a bare call, no member expression',
      code: `${IMPORT}\nrpc(whatever);`,
    },
    {
      name: 'no Supabase import — `.rpc` belongs to something else',
      code: `await db.rpc(name);`,
    },
  ],
  invalid: [
    {
      name: 'an identifier chooses the function',
      code: `${IMPORT}\nawait db.rpc(name, args);`,
      errors: [{ messageId: 'dynamicRpcName' }],
    },
    {
      name: 'an interpolated template chooses it too',
      code: `${IMPORT}\nawait db.rpc(\`get_\${kind}\`, args);`,
      errors: [{ messageId: 'dynamicRpcName' }],
    },
    {
      name: 'a non-string literal is not a function name',
      code: `${IMPORT}\nawait db.rpc(42);`,
      errors: [{ messageId: 'dynamicRpcName' }],
    },
    {
      name: 'still fires with every identifier renamed to foo and bar',
      code: `import { foo } from '@supabase/supabase-js';\nconst bar = foo();\nawait bar.rpc(baz);`,
      errors: [{ messageId: 'dynamicRpcName' }],
    },
  ],
});

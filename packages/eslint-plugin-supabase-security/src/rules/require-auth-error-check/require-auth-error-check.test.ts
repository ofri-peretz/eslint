/**
 * @fileoverview Tests for require-auth-error-check
 *
 * Coverage intent: every auth method, every way `error` can be bound, the shapes
 * that are not an auth call at all, and the litmus that the rule keys on the
 * `.auth.<method>()` shape rather than on what anything is named.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';

import { requireAuthErrorCheck } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const IMPORT = `import { createClient } from '@supabase/supabase-js';`;

ruleTester.run('require-auth-error-check', requireAuthErrorCheck, {
  valid: [
    {
      name: 'error taken and acted on',
      code: `${IMPORT}\nconst { data, error } = await db.auth.getUser();\nif (error) throw error;`,
    },
    {
      name: 'error renamed is still bound',
      code: `${IMPORT}\nconst { data, error: authError } = await db.auth.getSession();`,
    },
    {
      name: 'a rest element captures it',
      code: `${IMPORT}\nconst { data, ...rest } = await db.auth.getUser();`,
    },
    {
      name: 'a quoted key binds it too',
      code: `${IMPORT}\nconst { 'error': e } = await db.auth.getUser();`,
    },
    {
      name: 'not destructured — nothing omitted at the declarator',
      code: `${IMPORT}\nconst result = await db.auth.getUser();`,
    },
    {
      name: 'a method that throws rather than returning an error',
      code: `${IMPORT}\nconst { data } = await db.auth.admin.listUsers();`,
    },
    {
      name: 'not an auth call',
      code: `${IMPORT}\nconst { data } = await db.from('users').select();`,
    },
    {
      name: 'the owner is not `.auth`',
      code: `${IMPORT}\nconst { data } = await db.session.getUser();`,
    },
    {
      name: 'a computed method',
      code: `${IMPORT}\nconst { data } = await db.auth[method]();`,
    },
    {
      /*
       * `const k = 'error'` makes this pattern bind the error, and the node cannot
       * tell that from any other computed key. Abstaining is the only reading that
       * does not flag correct code.
       */
      name: 'a computed key could be `error`, so the rule abstains',
      code: `${IMPORT}\nconst { [k]: v, data } = await db.auth.getUser();`,
    },
    {
      name: 'the initialiser is not a call',
      code: `${IMPORT}\nconst { data } = cached;`,
    },
    {
      /*
       * A `for…of` head is the one place a destructuring pattern legitimately has
       * no initialiser — `let { data };` is a syntax error, so this is how that
       * branch is reachable at all.
       */
      name: 'a pattern in a for-of head has no initialiser',
      code: `${IMPORT}\nfor (const { data } of results) { use(data); }`,
    },
    {
      name: 'an auth method name on something that is not `.auth`',
      code: `${IMPORT}\nconst { data } = await db.getUser();`,
    },
    {
      name: 'an array pattern, not an object pattern',
      code: `${IMPORT}\nconst [first] = await db.auth.getUser();`,
    },
    {
      name: 'a bare call with no member expression',
      code: `${IMPORT}\nconst { data } = await getUser();`,
    },
    {
      name: 'no Supabase import — `.auth.getUser` belongs to something else',
      code: `const { data } = await db.auth.getUser();`,
    },
  ],
  invalid: [
    {
      name: 'getUser without its error',
      code: `${IMPORT}\nconst { data } = await db.auth.getUser();`,
      errors: [{ messageId: 'missingErrorCheck' }],
    },
    {
      name: 'getSession without its error',
      code: `${IMPORT}\nconst { data } = await db.auth.getSession();`,
      errors: [{ messageId: 'missingErrorCheck' }],
    },
    {
      name: 'refreshSession without its error',
      code: `${IMPORT}\nconst { data } = await db.auth.refreshSession();`,
      errors: [{ messageId: 'missingErrorCheck' }],
    },
    {
      name: 'exchangeCodeForSession without its error',
      code: `${IMPORT}\nconst { data } = await db.auth.exchangeCodeForSession(code);`,
      errors: [{ messageId: 'missingErrorCheck' }],
    },
    {
      name: 'no await — the same omission',
      code: `${IMPORT}\nconst { data } = db.auth.getUser();`,
      errors: [{ messageId: 'missingErrorCheck' }],
    },
    {
      name: 'nested destructuring still omits error',
      code: `${IMPORT}\nconst { data: { user } } = await db.auth.getUser();`,
      errors: [{ messageId: 'missingErrorCheck' }],
    },
    {
      /*
       * `db['auth']` is the same property as `db.auth` — a static string subscript
       * is not an evasion, and the devkit's `propertyName` resolves it. Listed here
       * rather than under valid because it is genuinely the same defect.
       */
      name: 'a static string subscript is the same property',
      code: `${IMPORT}\nconst { data } = await db['auth']['getUser']();`,
      errors: [{ messageId: 'missingErrorCheck' }],
    },
    {
      name: 'still fires with every identifier renamed to foo and bar',
      code: `import { foo } from '@supabase/supabase-js';\nconst bar = foo();\nconst { baz } = await bar.auth.getUser();`,
      errors: [{ messageId: 'missingErrorCheck' }],
    },
  ],
});

/**
 * @fileoverview Tests for require-auth-error-check
 *
 * Coverage intent: every auth method, every way `error` can be bound, the shapes
 * that are not an auth call at all, and the litmus that the rule keys on the
 * `.auth.<method>()` shape rather than on what anything is named.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import * as tsParser from '@typescript-eslint/parser';

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
    /*
     * FP-6 (2026-10-12 FP/FN audit). On failure `getUser()` resolves
     * `{ data: { user: null }, error }`, so a guard on the identity — `if (!user)`
     * — takes the "not signed in" branch: fail-closed. That is Supabase's own
     * documented pattern, and the rule reported it as CWE-287. The identity
     * guarded, optional-chained, or handed to a caller is now silent.
     */
    {
      name: 'FP: the documented guard on the identity',
      // @found supabase/supabase:examples/realtime/nextjs-auth-presence/pages/index.tsx:81
      code: `${IMPORT}\nexport async function getServerSideProps() {\n  const { data: { user } } = await supabase.auth.getUser();\n  if (!user) return { redirect: { destination: '/login', permanent: false } };\n  return { props: { user } };\n}`,
    },
    {
      name: 'FP: the identity returned to the caller, which decides',
      // @found vercel/nextjs-subscription-payments:utils/supabase/queries.ts:5
      code: `${IMPORT}\nexport const getUser = async (supabase) => {\n  const { data: { user } } = await supabase.auth.getUser();\n  return user;\n};`,
    },
    {
      name: 'FP: data.user read in a ternary test',
      // @found supabase/supabase:examples/user-management/ionic-angular-user-management/src/app/supabase.service.ts:35
      code: `${IMPORT}\nexport async function f() {\n  const { data: userData } = await db.auth.getUser();\n  return userData?.user ? { user: userData.user } : null;\n}`,
    },
    {
      name: 'FP: a session guard and an optional chain',
      // @found supabase-community/chatgpt-your-files:app/chat/page.tsx:77
      code: `${IMPORT}\nexport async function f() {\n  const { data: { session } } = await db.auth.getSession();\n  if (!session) return;\n  const { data: { user } } = await db.auth.getUser();\n  return user?.email ?? 'anonymous';\n}`,
    },
    {
      name: 'guard: a promise callback that hands data.user on',
      // @found supabase/supabase:examples/user-management/ionic-angular-user-management/src/app/supabase.service.ts:26
      code: `${IMPORT}\nexport function user() { return db.auth.getUser().then(({ data }) => data?.user); }`,
    },
    {
      name: 'a short-circuit on the identity, a defaulted data pattern',
      code: `${IMPORT}\nexport async function f() {\n  const { data: { user } = {} } = await db.auth.getUser();\n  return user && user.email;\n}`,
    },
    {
      name: 'a rest or computed field beside a guarded identity',
      code: `${IMPORT}\nconst { data: { [k]: v, ...others, session = null } } = await db.auth.getSession();\nif (!session) throw new Error('x');`,
    },
    {
      name: 'a loose or null comparison is a guard: null fails it',
      code: `${IMPORT}\nexport async function f() {\n  const { data: { user } } = await db.auth.getUser();\n  if (user != undefined) return 'dashboard';\n  const { data: { session } } = await db.auth.getSession();\n  if (session !== null) return 'dashboard';\n  return 'login';\n}`,
    },
    {
      name: 'data.user returned to the caller',
      code: `${IMPORT}\nexport async function f() { const { data } = await db.auth.getUser(); return data.user; }`,
    },
    {
      name: 'the claims guarded after getClaims',
      code: `${IMPORT}\nconst { data } = await db.auth.getClaims();\nif (!data?.claims) throw new Error('no session');`,
    },
    {
      name: 'the whole result handed to a caller',
      code: `${IMPORT}\nexport async function f() { const { data } = await db.auth.getUser(); return data; }`,
    },
    {
      name: 'a then() callback that binds error',
      code: `${IMPORT}\ndb.auth.getUser().then(({ data, error }) => (error ? null : data.user));`,
    },
    {
      name: 'a then() on something that is not an auth call',
      code: `${IMPORT}\nfetchUser().then(({ data }) => (data ? 'in' : 'out'));`,
    },
    {
      name: 'a then() with no callback, or a non-destructuring one',
      code: `${IMPORT}\ndb.auth.getUser().then();\ndb.auth.getUser().then(handle);\ndb.auth.getUser().then((result) => result);`,
    },
    {
      name: 'a then() that is called on a computed member',
      code: `${IMPORT}\ndb.auth.getUser()[method](({ data }) => data);`,
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
    // What still reports: the result trusted without its error or a guard.
    {
      name: 'the container tested — always truthy, so the failure passes (the bypass)',
      code: `${IMPORT}\nexport async function f() {\n  const { data } = await db.auth.getUser();\n  if (data) return 'admin-panel';\n  return 'login';\n}`,
      errors: [{ messageId: 'missingErrorCheck' }],
    },
    {
      name: 'the identity dereferenced with no check',
      code: `${IMPORT}\nexport async function del(id) {\n  const { data: { user } } = await db.auth.getUser();\n  await db.from('notes').delete().eq('id', id).eq('owner', user.id);\n}`,
      errors: [{ messageId: 'missingErrorCheck' }],
    },
    {
      name: 'data.user dereferenced with no check',
      code: `${IMPORT}\nconst { data } = await db.auth.getUser();\nconst id = data.user.id;`,
      errors: [{ messageId: 'missingErrorCheck' }],
    },
    {
      name: 'FN: a strict comparison with undefined is passed by the null a failure yields',
      // @found quint: benchmarks/quint/models/supabase-security.require-auth-error-check.qnt (UndefinedCompare, every binding)
      code: `${IMPORT}\nexport async function f() {\n  const { data: { user } } = await db.auth.getUser();\n  if (user !== undefined) return 'dashboard';\n  return 'login';\n}\nexport async function g() {\n  const { data } = await db.auth.getSession();\n  if (undefined === data.session) return 'login';\n  return 'dashboard';\n}\nexport async function h() {\n  const { data: { claims } } = await db.auth.getClaims();\n  return claims !== void 0 ? 'in' : 'out';\n}`,
      errors: [
        { messageId: 'missingErrorCheck' },
        { messageId: 'missingErrorCheck' },
        { messageId: 'missingErrorCheck' },
      ],
    },
    {
      name: 'a non-identity field of data is no guard',
      code: `${IMPORT}\nconst { data } = await db.auth.getUser();\nlog(data.properties);\nif (data) proceed();`,
      errors: [{ messageId: 'missingErrorCheck' }],
    },
    {
      name: 'FN: a then() callback that tests the container',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-supabase-security.md)
      code: `${IMPORT}\nexport const status = () => db.auth.getUser().then(({ data }) => (data ? 'in' : 'out'));`,
      errors: [{ messageId: 'missingErrorCheck' }],
    },
    {
      name: 'FN: getClaims without its error, the claims unchecked',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-supabase-security.md)
      code: `${IMPORT}\nconst { data: { claims } } = await db.auth.getClaims();\nlog(claims.sub);`,
      errors: [{ messageId: 'missingErrorCheck' }],
    },
  ],
});

const tsRuleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

tsRuleTester.run(
  'require-auth-error-check (TypeScript)',
  requireAuthErrorCheck,
  {
    valid: [
      {
        name: 'a non-null assertion inside a guard is still the guard',
        code: `${IMPORT}\nconst { data: { user } } = await db.auth.getUser();\nif (user!.id) audit();`,
      },
      {
        name: 'a cast identity handed on',
        code: `${IMPORT}\nexport async function f() { const { data } = await db.auth.getUser(); return data.user as User; }`,
      },
    ],
    invalid: [
      {
        name: 'a non-null assertion with no check',
        code: `${IMPORT}\nconst { data: { user } } = await db.auth.getUser();\nconst id: string = user!.id;`,
        errors: [{ messageId: 'missingErrorCheck' }],
      },
    ],
  },
);

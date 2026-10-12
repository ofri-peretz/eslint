/**
 * @fileoverview Tests for no-service-role-key-in-client
 *
 * Coverage intent: both report paths, every branch of the env-read parser, the
 * `server-only` abstention, and the shapes the rule must stay silent on. Plus
 * the litmus this repo applies to every rule — rename every identifier to
 * `foo`/`bar` and the rule still fires, because it keys on the property read off
 * `process.env` rather than on anything a developer chose to call a variable.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noServiceRoleKeyInClient } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const IMPORT = `import { createClient } from '@supabase/supabase-js';`;

/**
 * Supabase JWTs and secret keys are assembled at test time, so this file holds
 * no literal a secret scanner would read as a live key. The signature is not
 * a signature; only the payload's claims matter to the rule.
 */
const b64url = (text: string): string =>
  btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwt = (claims: Record<string, unknown>): string =>
  [
    b64url('{"alg":"HS256","typ":"JWT"}'),
    b64url(JSON.stringify(claims)),
    'bm90LWEtc2lnbmF0dXJl',
  ].join('.');
const SERVICE_JWT = jwt({
  iss: 'supabase',
  ref: 'abcdefghij',
  role: 'service_role',
});
const ANON_JWT = jwt({ iss: 'supabase', ref: 'abcdefghij', role: 'anon' });
const DEMO_SERVICE_JWT = jwt({ iss: 'supabase-demo', role: 'service_role' });
const SECRET_KEY = ['sb', 'secret', 'Zx9Qw2Lm8Rt4Yv6Np0Kc3Hd5'].join('_');
const SSR = `import { createBrowserClient } from '@supabase/ssr';`;

ruleTester.run('no-service-role-key-in-client', noServiceRoleKeyInClient, {
  valid: [
    {
      name: 'the anon key in a client component is the whole point of the anon key',
      code: `
        'use client';
        ${IMPORT}
        export const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      `,
    },
    {
      name: 'service_role on the server, where it belongs',
      code: `
        ${IMPORT}
        export const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      `,
    },
    {
      name: 'a client component that imports server-only cannot reach the browser',
      code: `
        'use client';
        import 'server-only';
        ${IMPORT}
        export const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      `,
    },
    {
      name: 'no Supabase import — SERVICE_ROLE here belongs to something else',
      code: `
        'use client';
        export const key = process.env.NEXT_PUBLIC_SERVICE_ROLE_TOKEN;
      `,
    },
    {
      name: 'a computed read whose key is not a literal is unreadable, not a finding',
      code: `
        'use client';
        ${IMPORT}
        export const key = process.env[whichever];
      `,
    },
    {
      name: 'a two-level member whose middle property is not `env`',
      code: `
        'use client';
        ${IMPORT}
        export const key = settings.secrets.SUPABASE_SERVICE_ROLE_KEY;
      `,
    },
    {
      name: 'a property named env on something that is not process',
      code: `
        'use client';
        ${IMPORT}
        export const key = config.env.SUPABASE_SERVICE_ROLE_KEY;
      `,
    },
    {
      name: 'a directive that is not use client does not make the file a client component',
      code: `
        'use strict';
        ${IMPORT}
        export const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
      `,
    },
    {
      /*
       * An expression statement that is not a string literal at all — the other
       * way out of the directive scan, and the one a bundler also treats as "no
       * directive here", since a directive prologue ends at the first statement
       * that is not a string literal.
       */
      name: 'a leading call expression ends the directive prologue',
      code: `
        init();
        'use client';
        ${IMPORT}
        export const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
      `,
    },
    {
      name: 'a leading numeric literal ends it too',
      code: `
        0;
        'use client';
        ${IMPORT}
        export const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
      `,
    },
    {
      name: 'a leading statement that is not a directive stops the directive scan',
      code: `
        ${IMPORT}
        'use client';
        export const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
      `,
    },
    // 2026-10-12 FP/FN audit: the new paths, and what they stay silent on.
    {
      name: 'the anon JWT and a publishable key are public by design',
      code: `${IMPORT}\nexport const a = createClient('https://abcdefghij.supabase.co', '${ANON_JWT}');\nexport const b = createClient('https://abcdefghij.supabase.co', 'sb_publishable_Zx9Qw2Lm8Rt4Yv6Np0Kc3Hd5');`,
    },
    {
      name: "the local-development service key every 'supabase start' prints",
      code: `${IMPORT}\nexport const local = createClient('http://127.0.0.1:54321', '${DEMO_SERVICE_JWT}');`,
    },
    {
      name: 'secret-key stand-ins in tests',
      // @found supabase/supabase:examples/edge-functions/supabase/functions/unit-testing/tests/utils/supabase_env.ts:12
      code: `${IMPORT}\nexport const env = { secretKeys: { default: 'sb_secret_xy' } };\nstubEnv('SUPABASE_SECRET_KEY', 'sb_secret_abcdefghijklmnop');`,
    },
    {
      name: 'strings that are not JWTs or not JSON payloads',
      code: `${IMPORT}\nexport const a = ['eyJ.only-two', 'eyJhbGciOiJIUzI1NiJ9.!!!.sig', 'eyJhbGciOiJIUzI1NiJ9.bnVsbA.sig', 'abc.def.ghi', 42];`,
    },
    {
      name: 'a browser client given the anon key',
      code: `${SSR}\nexport const db = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);`,
    },
    {
      name: 'a browser client given a literal URL and the anon key',
      code: `${SSR}\nexport const db = createBrowserClient('https://abcdefghij.supabase.co', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);`,
    },
    {
      name: 'a server client may hold service_role',
      code: `import { createServerClient } from '@supabase/ssr';\nexport const db = createServerClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { cookies });`,
    },
    {
      name: 'a local function named like the factory is not it',
      code: `${IMPORT}\nfunction createBrowserClient(a, b) { return [a, b]; }\ncreateBrowserClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);`,
    },
    {
      name: 'SvelteKit public env without the service key, and the private env',
      code: `${IMPORT}\nimport { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';\nimport { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';\nimport def from '$env/static/public';\nimport { env } from '$env/dynamic/public';\nexport const url = env.PUBLIC_SUPABASE_URL;`,
    },
    {
      name: 'a deeper member of the dynamic env object is not a variable',
      code: `${IMPORT}\nimport { env } from '$env/dynamic/public';\nexport const x = env.SERVICE_ROLE.length;`,
    },
  ],
  invalid: [
    {
      name: 'the service_role key behind NEXT_PUBLIC_, which inlines it into the bundle',
      code: `
        ${IMPORT}
        export const db = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY);
      `,
      errors: [{ messageId: 'publicPrefix' }],
    },
    {
      name: 'the same mistake under Vite',
      code: `
        ${IMPORT}
        export const db = createClient(url, import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
      `,
      errors: [{ messageId: 'publicPrefix' }],
    },
    /*
     * One case per entry in PUBLIC_PREFIXES. Not padding: the taxonomy gate
     * requires every row of a detection table to have a case that fails when the
     * row is deleted, because a prefix nothing exercises is a prefix nobody knows
     * is broken. `PUBLIC_` is last on purpose — every other entry contains it as a
     * substring, so a case using `PUBLIC_` alone would pass for the wrong reason.
     */
    {
      name: 'the same mistake under Create React App',
      code: `
        ${IMPORT}
        export const db = createClient(url, process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY);
      `,
      errors: [{ messageId: 'publicPrefix' }],
    },
    {
      name: 'the same mistake under Gatsby',
      code: `
        ${IMPORT}
        export const db = createClient(url, process.env.GATSBY_SUPABASE_SERVICE_ROLE_KEY);
      `,
      errors: [{ messageId: 'publicPrefix' }],
    },
    {
      name: 'the same mistake under Nuxt',
      code: `
        ${IMPORT}
        export const db = createClient(url, process.env.NUXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY);
      `,
      errors: [{ messageId: 'publicPrefix' }],
    },
    {
      name: 'the same mistake under Expo',
      code: `
        ${IMPORT}
        export const db = createClient(url, process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY);
      `,
      errors: [{ messageId: 'publicPrefix' }],
    },
    {
      name: 'the same mistake under SvelteKit, whose prefix is bare PUBLIC_',
      code: `
        ${IMPORT}
        export const db = createClient(url, process.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY);
      `,
      errors: [{ messageId: 'publicPrefix' }],
    },
    {
      name: 'a bracket read is the same read',
      code: `
        ${IMPORT}
        export const db = createClient(url, process.env['NEXT_PUBLIC_SERVICE_ROLE_KEY']);
      `,
      errors: [{ messageId: 'publicPrefix' }],
    },
    {
      name: 'service_role read inside a client component',
      code: `
        'use client';
        ${IMPORT}
        export const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
      `,
      errors: [{ messageId: 'inClientComponent' }],
    },
    {
      /*
       * `process['env']` reaches the same property as `process.env`. The first
       * version of this rule read `.property.name` directly and missed it — a
       * blind spot the person writing the leak does not share.
       */
      name: 'a bracket-spelled `env` is the same env',
      code: `
        ${IMPORT}
        export const db = createClient(url, process['env'].NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY);
      `,
      errors: [{ messageId: 'publicPrefix' }],
    },
    {
      /*
       * The litmus. Every identifier a developer chose is `foo` or `bar`; the only
       * thing left that could carry the signal is the property read off
       * `process.env`, which is what the rule keys on. If this stopped reporting,
       * the rule would be matching names rather than shapes.
       */
      name: 'still fires with every identifier renamed to foo and bar',
      code: `
        'use client';
        import { foo } from '@supabase/supabase-js';
        const bar = process.env.SUPABASE_SERVICE_ROLE_KEY;
        export const baz = foo(bar);
      `,
      errors: [{ messageId: 'inClientComponent' }],
    },
    {
      name: 'the prefix wins over the client-component path when both apply',
      code: `
        'use client';
        ${IMPORT}
        export const db = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY);
      `,
      errors: [{ messageId: 'publicPrefix' }],
    },
    // 2026-10-12 FP/FN audit — the paths the env-read-only reader missed.
    {
      name: 'FN: a browser client given service_role, no prefix, no directive',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-supabase-security.md)
      code: `${SSR}\nexport const foo = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);`,
      errors: [
        {
          messageId: 'inBrowserClient',
          data: {
            factory: 'createBrowserClient',
            name: 'SUPABASE_SERVICE_ROLE_KEY',
          },
        },
      ],
    },
    {
      name: 'a prefixed key in a browser client reports once, at the read',
      code: `${SSR}\nexport const db = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY);`,
      errors: [{ messageId: 'publicPrefix' }],
    },
    {
      name: 'a browser client in a client component reports once, at the read',
      code: `'use client';\n${SSR}\nexport const db = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);`,
      errors: [{ messageId: 'inClientComponent' }],
    },
    {
      name: 'FN: the auth-helpers browser factory, the key through a const, renamed',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-supabase-security.md)
      code: `import { createPagesBrowserClient as bar } from '@supabase/auth-helpers-nextjs';\nconst baz = process.env.SUPABASE_SERVICE_ROLE_KEY;\nexport const foo = bar({ supabaseUrl: process.env.SUPABASE_URL, supabaseKey: baz });\nexport const qux = bar(process.env.SUPABASE_URL, baz);\nexport const quux = bar({ supabaseUrl: 'u' });`,
      errors: [
        { messageId: 'inBrowserClient' },
        { messageId: 'inBrowserClient' },
      ],
    },
    {
      name: 'FN: SvelteKit public static env carrying the service key',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-supabase-security.md)
      code: `${IMPORT}\nimport { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_SERVICE_ROLE_KEY as foo } from '$env/static/public';\nexport const a = createClient(PUBLIC_SUPABASE_URL, foo);`,
      errors: [
        {
          messageId: 'publicPrefix',
          data: { name: 'PUBLIC_SUPABASE_SERVICE_ROLE_KEY', prefix: 'PUBLIC_' },
        },
      ],
    },
    {
      name: 'FN: SvelteKit public static env, quoted export name',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-supabase-security.md)
      code: `${IMPORT}\nimport { 'PUBLIC_SUPABASE_SERVICE_ROLE_KEY' as foo } from '$env/static/public';\nexport const a = createClient('u', foo);`,
      errors: [{ messageId: 'publicPrefix' }],
    },
    {
      name: 'FN: SvelteKit public dynamic env carrying the service key',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-supabase-security.md)
      code: `${IMPORT}\nimport { env } from '$env/dynamic/public';\nexport const a = createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY);`,
      errors: [
        {
          messageId: 'publicPrefix',
          data: { name: 'PUBLIC_SUPABASE_SERVICE_ROLE_KEY', prefix: 'PUBLIC_' },
        },
      ],
    },
    {
      name: 'FN: a service_role JWT written into source',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-supabase-security.md)
      code: `${IMPORT}\nexport const admin = createClient('https://abcdefghij.supabase.co', '${SERVICE_JWT}');`,
      errors: [{ messageId: 'hardcodedServiceRole' }],
    },
    {
      name: 'FN: an sb_secret_ key written into source, even in a server-only module',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-supabase-security.md)
      code: `import 'server-only';\n${IMPORT}\nexport const admin = createClient('https://abcdefghij.supabase.co', '${SECRET_KEY}');`,
      errors: [{ messageId: 'hardcodedServiceRole' }],
    },
  ],
});

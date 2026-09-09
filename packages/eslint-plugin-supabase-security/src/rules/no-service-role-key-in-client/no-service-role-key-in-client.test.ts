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
  ],
});

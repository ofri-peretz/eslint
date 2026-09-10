/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview The one place this plugin decides "is this a Supabase file?".
 *
 * Every rule here abstains unless it is. `.from()`, `.rpc()` and `.auth` are
 * ordinary member names that any codebase may own — an ORM wrapper, a router, a
 * test double — so without a gate this plugin would report on code that has
 * never seen Supabase.
 *
 * Routed through the devkit probe rather than a hand-written `ImportDeclaration`
 * visitor, which is what the sibling plugins learned the hard way: a pair of
 * visitors for ESM and `require()` misses `import s = require('@supabase/…')`,
 * a lazy `await import()` inside a factory, re-export forms, and Deno's `npm:`
 * and `deno.land/x` specifiers. A file the gate misses does not degrade — every
 * rule in the plugin goes silent.
 */
import { createModuleEvidence } from '@interlace/eslint-devkit';
import type { TSESTree } from '@typescript-eslint/utils';

/**
 * The client package. `@supabase/ssr` is listed beside it because that is what a
 * Next.js or SvelteKit app imports `createServerClient` / `createBrowserClient`
 * from — a file that only imports `@supabase/ssr` is unambiguously a Supabase
 * file, and it is exactly where the service-role mistake gets made.
 */
export const SUPABASE_SCOPE = '@supabase';

/**
 * Matched on the scope rather than a package list. `@supabase/ssr` is what a
 * Next.js or SvelteKit app imports `createBrowserClient` from, `auth-helpers-*`
 * is what the previous generation used, and both are exactly where the
 * service-role mistake gets made — a list would have to be extended every time
 * Supabase splits a package, and the failure mode of a missed entry is silence.
 */
export const fileUsesSupabase: (ast: TSESTree.Program) => boolean =
  createModuleEvidence({
    scopes: [SUPABASE_SCOPE],
  });

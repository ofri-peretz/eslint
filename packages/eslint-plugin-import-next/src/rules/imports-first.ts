/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: imports-first (deprecated alias of `first`)
 *
 * eslint-plugin-import 2.32.0 still exports `imports-first`, deprecated, as
 * `{ ...first, meta: { ...first.meta, deprecated: true } }`
 * (src/rules/imports-first.js). A config or a disable comment naming it threw
 * "Could not find rule" against this plugin. It is the same rule as `first`:
 * the same `create`, the same schema, so the same options and the same reports.
 * Only `meta` differs, in that it is deprecated and points at `first`.
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/v2.32.0/src/rules/imports-first.js
 */

import { first } from './first';

export type { RuleOptions } from './first';

export const importsFirst: typeof first = {
  ...first,
  meta: {
    ...first.meta,
    // oxlint has no native `imports-first`, so the alias must not inherit
    // `first`'s nativeEquivalent (`import/first`); the overlap triage keys on
    // the rule's own name.
    interop: { runtimes: first.meta.interop!.runtimes },
    deprecated: true,
    replacedBy: ['first'],
    docs: {
      ...first.meta.docs,
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/imports-first.md',
      description:
        'Deprecated alias of `first`: replaced by `import-next/first`',
    },
  },
};

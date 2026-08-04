/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * require-tls — Knex-flavoured CWE-319.
 *
 * Instantiates the shared detector (`createRequireTlsRule` in
 * @interlace/eslint-devkit) with Knex's config shape: the connection settings
 * live one level down under `connection`, which is why that key is declared
 * here — the factory only follows nesting through keys a driver names.
 *
 * See docs/rules/require-tls.md.
 */

import { createRequireTlsRule } from '@interlace/eslint-devkit';

export const requireTls = createRequireTlsRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require TLS on Knex database connections, so queries and credentials are not sent in cleartext and the server is authenticated.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-knex-security/docs/rules/require-tls.md',
      cwe: 'CWE-319',
      cvss: 7.4,
      confidence: 'high',
    },
  },
  modules: ['knex'],
  // `connection` is Knex's nested config bag; `client` and `searchPath` mark an
  // object as a Knex config rather than an arbitrary options object.
  connectionKeys: ['connection', 'client', 'searchPath'],
  urlSchemes: ['postgres', 'postgresql', 'mysql', 'mysql2'],
  fix: 'Keep TLS on and give Knex the server CA — `connection: { ssl: { ca: fs.readFileSync(caPath) } }`.',
  documentationLink: 'https://knexjs.org/guide/#configuration-options',
});

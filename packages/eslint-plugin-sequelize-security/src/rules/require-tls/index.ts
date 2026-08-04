/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * require-tls — Sequelize-flavoured CWE-319.
 *
 * Instantiates the shared detector (`createRequireTlsRule` in
 * @interlace/eslint-devkit).
 *
 * Sequelize passes TLS settings through to the underlying driver via
 * `dialectOptions`, so the dangerous property sits two levels down:
 * `{ dialectOptions: { ssl: { rejectUnauthorized: false } } }`. Declaring
 * `dialectOptions` as a connection key is what lets the factory follow it.
 *
 * See docs/rules/require-tls.md.
 */

import { createRequireTlsRule } from '@interlace/eslint-devkit';

export const requireTls = createRequireTlsRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require TLS on Sequelize connections, so queries and credentials are not sent in cleartext and the server is authenticated.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-sequelize-security/docs/rules/require-tls.md',
      cwe: 'CWE-319',
      cvss: 7.4,
      confidence: 'high',
    },
  },
  modules: ['sequelize', 'sequelize-typescript'],
  connectionKeys: ['dialectOptions', 'dialect', 'replication'],
  urlSchemes: ['postgres', 'postgresql', 'mysql', 'mariadb', 'mssql'],
  fix: 'Keep TLS on and supply the CA — `dialectOptions: { ssl: { require: true, ca } }`.',
  documentationLink:
    'https://sequelize.org/docs/v6/other-topics/dialect-specific-things/#postgresql',
});

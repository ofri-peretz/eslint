/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * require-tls — TypeORM-flavoured CWE-319.
 *
 * Instantiates the shared detector (`createRequireTlsRule` in
 * @interlace/eslint-devkit).
 *
 * TypeORM's `DataSourceOptions` is a flat object, so `ssl` and `extra.ssl` both
 * appear in the wild; `extra` is the passthrough bag to the underlying driver
 * and is declared here so the factory follows it. The mssql driver spells the
 * verification flag `trustServerCertificate`, which is dangerous when TRUE —
 * the factory handles that inversion.
 *
 * See docs/rules/require-tls.md.
 */

import { createRequireTlsRule } from '@interlace/eslint-devkit';

export const requireTls = createRequireTlsRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require TLS on TypeORM DataSource connections, so queries and credentials are not sent in cleartext and the server is authenticated.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-typeorm-security/docs/rules/require-tls.md',
      cwe: 'CWE-319',
      cvss: 7.4,
      confidence: 'high',
    },
  },
  modules: ['typeorm'],
  connectionKeys: ['extra', 'type', 'entities', 'synchronize', 'options'],
  urlSchemes: ['postgres', 'postgresql', 'mysql', 'mariadb', 'mssql'],
  fix: 'Keep TLS on and supply the CA — `ssl: { ca: fs.readFileSync(caPath) }`, or `extra: { ssl: { ca } }` for driver passthrough.',
  documentationLink: 'https://typeorm.io/data-source-options',
});

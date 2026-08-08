/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-hardcoded-credentials — Sequelize CWE-798.
 *
 * Instantiates the shared detector (`createHardcodedCredentialsRule` in
 * @interlace/eslint-devkit).
 *
 * See docs/rules/no-hardcoded-credentials.md.
 */

import { createHardcodedCredentialsRule } from '@interlace/eslint-devkit';

export const noHardcodedCredentials = createHardcodedCredentialsRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow literal database passwords in Sequelize connection configuration, including credentials embedded in a connection URL.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-sequelize-security/docs/rules/no-hardcoded-credentials.md',
      cwe: 'CWE-798',
      cvss: 9.8,
      confidence: 'high',
    },
  },
  modules: ['sequelize','sequelize-typescript'],
  connectionKeys: ['dialectOptions','dialect','replication'],
  urlSchemes: ['postgres','postgresql','mysql','mariadb'],
  fix: 'Read the password from the environment — `password: process.env.DB_PASSWORD` — and keep the value in your secret manager, never in the repo.',
  urlFix: 'Keep the secret out of the URL: build the config from discrete fields with `password: process.env.DB_PASSWORD`, or inject the whole URL as `process.env.DATABASE_URL`.',
  documentationLink: 'https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password',
});

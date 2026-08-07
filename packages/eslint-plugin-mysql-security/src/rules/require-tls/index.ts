/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * require-tls — mysql2 / mysql-flavoured CWE-319.
 *
 * Instantiates the shared detector (`createRequireTlsRule` in
 * @interlace/eslint-devkit).
 *
 * mysql2 is the driver where this matters most in practice: it accepts the
 * verification flag at the top level as well as inside `ssl`, and the
 * `mysql://` URL form takes `?ssl=false`. Both shapes are covered.
 *
 * See docs/rules/require-tls.md.
 */

import { createRequireTlsRule } from '@interlace/eslint-devkit';

export const requireTls = createRequireTlsRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require TLS on mysql2 / mysql connections, so queries and credentials are not sent in cleartext and the server is authenticated.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mysql-security/docs/rules/require-tls.md',
      cwe: 'CWE-319',
      cweJustification:
        'CWE-319 (Cleartext Transmission) covers the tlsDisabled finding. The second finding, certificateValidationDisabled, is CWE-295 (Improper Certificate Validation): the channel is still encrypted, but the peer is no longer authenticated, so an attacker who answers in place of the database completes the handshake. One rule, two weaknesses — meta.docs.cwe carries a single identifier, so the secondary mapping is recorded here.',
      cvss: 7.4,
      confidence: 'high',
    },
  },
  modules: ['mysql2', 'mysql'],
  connectionKeys: ['connectionLimit', 'waitForConnections', 'multipleStatements'],
  urlSchemes: ['mysql'],
  fix: 'Keep TLS on and give the driver the server CA — `ssl: { ca: fs.readFileSync(caPath) }`. `ssl: "Amazon RDS"` selects a bundled CA on RDS.',
  documentationLink: 'https://sidorares.github.io/node-mysql2/docs/documentation/ssl',
});

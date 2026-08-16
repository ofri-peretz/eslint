/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Enforce secure storage patterns for credentials
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/522.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  expressionNamesACredential,
  isEncrypted,
  isEncryptedExpression,
  isEnvironmentWrite,
  isWebStorageWrite,
  storesACredential,
} from '../../utils/credential-evidence';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected' | 'credentialInEnvironment';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requireSecureCredentialStorage = createRule<RuleOptions, MessageIds>({
  name: 'require-secure-credential-storage',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/require-secure-credential-storage.md',
      description: 'Enforce secure storage patterns for credentials',
      cwe: 'CWE-312',
      cvss: 5.5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-312',
        description: 'Enforce secure storage patterns for credentials detected - Credentials without encryption',
        severity: 'HIGH',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/312.html',
      }),
      credentialInEnvironment: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Credential written to process.env',
        cwe: 'CWE-526',
        description:
          'A credential assigned into process.env is inherited by every child process this app spawns, is readable at /proc/<pid>/environ, and is captured verbatim by crash dumps and by the environment snapshots error reporters send upstream.',
        severity: 'HIGH',
        fix: 'Keep the secret in a variable scoped to the code that needs it, or fetch it from a secrets manager at the point of use. If a child process genuinely needs it, pass it through the `env` option of spawn/execFile for that one call instead of mutating the parent environment.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/526.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      /**
       * A credential in `localStorage` / `sessionStorage`: readable by any script on
       * the origin, and it survives the tab. This rule used to fire on any `.setItem`
       * or `.writeFile` at all, with no evidence a credential was involved, and
       * `require-storage-encryption` carried a byte-identical implementation — so every
       * match was reported twice. Disk writes now belong to that rule; this one owns
       * Web Storage. See utils/credential-evidence.ts.
       *
       * Kept despite living in the NODE plugin, because React Native and
       * isomorphic code linted with this config do reach `AsyncStorage` and
       * `localStorage`. It is not, on its own, enough — see below.
       */
      CallExpression(node: TSESTree.CallExpression) {
        if (!isWebStorageWrite(node)) return;
        if (!storesACredential(node) || isEncrypted(node)) return;
        context.report({ node, messageId: 'violationDetected' });
      },

      /**
       * `process.env.SESSION_TOKEN = token` — the Node sink this rule was
       * missing, and the reason it was VACUOUS on server code.
       *
       * Every sink above is a browser or React Native global. None exists in
       * Node, so in `eslint-plugin-node-security` this rule could not fire on a
       * pure server codebase at all: 29 test cases, a CWE, a CVSS score, and no
       * reachable sink. Disk writes could not simply be added here —
       * `require-storage-encryption` owns those, and duplicating them is the
       * exact double-reporting defect both rules were split apart to fix. The
       * environment is the sink neither rule claimed.
       *
       * Evidence, not shape: the variable NAME on either side must name a
       * credential, exactly as the Web Storage path demands. `process.env.PORT =
       * '3000'` and `process.env.NODE_ENV = 'test'` — the two things this
       * assignment is nearly always used for — carry no such evidence and stay
       * quiet.
       */
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (!isEnvironmentWrite(node)) return;
        if (isEncryptedExpression(node.right)) return;
        if (
          !expressionNamesACredential(node.left) &&
          !expressionNamesACredential(node.right)
        ) {
          return;
        }
        context.report({ node, messageId: 'credentialInEnvironment' });
      },
    };
  },
});

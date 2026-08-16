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
  isEncrypted,
  isWebStorageWrite,
  storesACredential,
} from '../../utils/credential-evidence';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

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
      })
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
       */
      CallExpression(node: TSESTree.CallExpression) {
        if (!isWebStorageWrite(node)) return;
        if (!storesACredential(node) || isEncrypted(node)) return;
        context.report({ node, messageId: 'violationDetected' });
      },
    };
  },
});

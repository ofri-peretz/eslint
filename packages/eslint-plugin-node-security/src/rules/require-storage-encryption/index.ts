/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require encryption for persistent storage
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/311.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  isEncrypted,
  isFileWrite,
  storesACredential,
} from '../../utils/credential-evidence';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requireStorageEncryption = createRule<RuleOptions, MessageIds>({
  name: 'require-storage-encryption',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/require-storage-encryption.md',
      description: 'Require encryption for persistent storage',
      cwe: 'CWE-312',
      cvss: 5.5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-312',
        description: 'Require encryption for persistent storage detected - Storage without encryption',
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
       * A credential written to disk in the clear. Previously this fired on every
       * `.writeFile` and `.setItem` in the file — `writeFile(sitemapPath, sitemap)`
       * included — and duplicated `require-secure-credential-storage` exactly. Web
       * Storage now belongs to that rule; this one owns the filesystem, and both
       * require evidence that what is being stored is a credential.
       */
      CallExpression(node: TSESTree.CallExpression) {
        if (!isFileWrite(node)) return;
        if (!storesACredential(node) || isEncrypted(node)) return;
        context.report({ node, messageId: 'violationDetected' });
      },
    };
  },
});

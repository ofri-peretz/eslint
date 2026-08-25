/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent disabled SSL/TLS certificate validation
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected' | 'noopHostnameVerification';

/**
 * Function types whose own `return`s belong to them, not to an enclosing
 * `checkServerIdentity`.
 */
const NON_ERROR_UNARY = 'void';

/**
 * Can this returned expression never be the `Error` that `checkServerIdentity`
 * is contracted to hand back on a hostname mismatch?
 *
 * Node treats *any* returned value as "verification failed" only when it is an
 * Error; `undefined`, `null` and booleans all read as "this certificate is for
 * the host we asked for". So a body that can only produce those has stubbed
 * hostname verification out, whatever it looks like.
 *
 * Anything else — an identifier, a call, `new Error(…)`, a conditional — might
 * be an Error, and a rule that cannot prove otherwise must stay quiet.
 */
function isDefinitelyNotError(node: TSESTree.Node): boolean {
  if (node.type === 'Literal') return true;
  if (node.type === 'Identifier') return node.name === 'undefined';
  if (node.type === 'UnaryExpression') return node.operator === NON_ERROR_UNARY;
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noDisabledCertificateValidation = createRule<RuleOptions, MessageIds>({
  name: 'no-disabled-certificate-validation',
  // An integration test that points at a local server with a self-signed
  // certificate sets `rejectUnauthorized: false` because that is the only way
  // to talk to it. All 21 findings on mariadb-connector-nodejs were in
  // `test/`, alongside 20 more from no-self-signed-certs in the same files.
  skipTestFiles: true,
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-disabled-certificate-validation.md',
      description: 'Prevent disabled SSL/TLS certificate validation',
      cwe: 'CWE-295',
      cvss: 7.4,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Disabled Certificate Validation',
        cwe: 'CWE-295',
        description: 'SSL/TLS certificate validation is disabled - man-in-the-middle attack possible',
        severity: 'CRITICAL',
        fix: 'Remove rejectUnauthorized: false or verify: false, fix certificate issues properly',
        documentationLink: 'https://cwe.mitre.org/data/definitions/295.html',
      }),
      noopHostnameVerification: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hostname verification stubbed out',
        cwe: 'CWE-295',
        description:
          'checkServerIdentity can never return an Error, so a certificate validly issued for ANY domain is accepted for this host — the exact MITM that hostname verification prevents.',
        severity: 'CRITICAL',
        fix: 'Delete the override, or delegate: const err = tls.checkServerIdentity(host, cert); if (err) return err;',
        documentationLink: 'https://cwe.mitre.org/data/definitions/295.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }
    
    const dangerousProperties = new Set(['rejectUnauthorized', 'strictSSL', 'verify']);

    /**
     * Open `checkServerIdentity` block bodies, innermost last. A body is
     * damning until something in it proves it can report a mismatch.
     */
    const identityChecks: Array<{
      property: TSESTree.Property;
      canReportMismatch: boolean;
    }> = [];

    return {
      Property(node: TSESTree.Property) {
        // Check for dangerous SSL options set to false
        if (node.key.type === 'Identifier' &&
            dangerousProperties.has(node.key.name) &&
            node.value.type === 'Literal' &&
            node.value.value === false) {
          report(node);
        }

        if (
          node.key.type !== 'Identifier' ||
          node.key.name !== 'checkServerIdentity'
        ) {
          return;
        }
        const implementation = node.value;
        if (
          implementation.type !== 'FunctionExpression' &&
          implementation.type !== 'ArrowFunctionExpression'
        ) {
          // A named reference is opaque — `checkServerIdentity: verifyPeer`
          // may well be a real verifier, and guessing is how a rule reports
          // something it cannot justify.
          return;
        }

        // `(host, cert) => tls.checkServerIdentity(host, cert)` is decided by
        // its single expression; there is no `return` to wait for.
        if (
          implementation.type === 'ArrowFunctionExpression' &&
          implementation.body.type !== 'BlockStatement'
        ) {
          if (isDefinitelyNotError(implementation.body)) {
            context.report({ node, messageId: 'noopHostnameVerification' });
          }
          return;
        }

        identityChecks.push({ property: node, canReportMismatch: false });
      },

      'Property:exit'(node: TSESTree.Property) {
        const open = identityChecks[identityChecks.length - 1];
        if (open === undefined || open.property !== node) return;
        identityChecks.pop();
        if (!open.canReportMismatch) {
          context.report({ node, messageId: 'noopHostnameVerification' });
        }
      },

      ReturnStatement(node: TSESTree.ReturnStatement) {
        const open = identityChecks[identityChecks.length - 1];
        if (open === undefined) return;
        if (node.argument !== null && !isDefinitelyNotError(node.argument)) {
          open.canReportMismatch = true;
        }
      },

      ThrowStatement() {
        const open = identityChecks[identityChecks.length - 1];
        if (open !== undefined) {
          open.canReportMismatch = true;
        }
      },


      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // Check for NODE_TLS_REJECT_UNAUTHORIZED = '0'
        if (node.left.type === 'MemberExpression' &&
            node.left.object.type === 'MemberExpression' &&
            node.left.object.object.type === 'Identifier' &&
            node.left.object.object.name === 'process' &&
            node.left.object.property.type === 'Identifier' &&
            node.left.object.property.name === 'env' &&
            node.left.property.type === 'Identifier' &&
            node.left.property.name === 'NODE_TLS_REJECT_UNAUTHORIZED') {
          
          if (node.right.type === 'Literal' && node.right.value === '0') {
            report(node);
          }
        }
      },
    };
  },
});

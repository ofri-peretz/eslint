/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow credentials in URL query parameters
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/598.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noCredentialsInQueryParams = createRule<RuleOptions, MessageIds>({
  name: 'no-credentials-in-query-params',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-credentials-in-query-params.md',
      description: 'Disallow credentials in URL query parameters',
      cwe: 'CWE-798',
      cvss: 9.8,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Credentials in Query Parameters',
        cwe: 'CWE-798',
        description: 'Credentials detected in URL query parameters - this is a security risk',
        severity: 'CRITICAL',
        fix: 'Use secure methods: POST body, headers (Authorization), or secure cookies',
        documentationLink: 'https://cwe.mitre.org/data/definitions/798.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sensitiveParams = ['password=', 'token=', 'apikey=', 'secret=', 'auth='];
    
    function report(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'violationDetected',
      });
    }
    
    return {
      Literal(node: TSESTree.Literal) {
        if (typeof node.value === 'string') {
          const url = node.value.toLowerCase();
          
          if (sensitiveParams.some(param => url.includes('?' + param) || url.includes('&' + param))) {
            report(node);
          }
        }
      },
      
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        // Read the STATIC text, not `sourceCode.getText(node)`.
        //
        // getText returns the template's source, interpolations included, so
        // `${maskToken(session.accessToken)}` contributed the characters of its
        // own source code to the match. Combined with the missing `?`/`&`
        // prefix below, that made this branch fire on
        //
        //   outputDebug(`Loaded session for ${store}: token=${maskToken(t)}`)
        //
        // — a debug log, not a URL, whose value is explicitly MASKED. Reporting
        // it was wrong twice over. (Repo doctrine: match the AST, never printed
        // source.)
        //
        // A placeholder marks each interpolation so `?` + `token=` cannot be
        // formed by accident across a boundary.
        const INTERPOLATION = '\u0001';
        const text = node.quasis
          // `raw` is always populated; `cooked` is null only for an invalid
          // escape in a TAGGED template, which a URL string never is.
          .map((q) => q.value.raw)
          .join(INTERPOLATION)
          .toLowerCase();

        // Same test the Literal branch uses. The asymmetry was the bug: a
        // literal needed `?token=` or `&token=`, a template matched a bare
        // `token=` anywhere — including the `: token=` of a log line.
        if (
          sensitiveParams.some(
            (param) => text.includes(`?${param}`) || text.includes(`&${param}`),
          )
        ) {
          report(node);
        }
      },
    };
  },
});

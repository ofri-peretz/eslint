/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Detect CORS configured to reflect any origin while allowing
 * credentials
 *
 * `origin: '*'` on its own is not a vulnerability — browsers refuse to send
 * cookies to a wildcard origin, which is why a public read-only API can set it
 * safely. The dangerous configuration is a wildcard or reflected origin
 * *combined with* `credentials: true`: every site the victim visits can then
 * call the API with the victim's session cookie and read the response.
 *
 * That pairing is what this rule reports, and only when both values are
 * literals. `origin: true` + `credentials: true` — reflect whatever origin
 * asked — is the shape found in the measured corpus.
 *
 * Deliberately not reported: a wildcard without credentials, and a function
 * `origin` callback. A callback is the documented way to validate an origin
 * against an allow-list, so flagging it would punish the correct pattern.
 *
 * CWE-942: Permissive Cross-domain Policy with Untrusted Domains
 */

import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';
import {
  isTestFile,
  isTrueLiteral,
  objectProperties,
} from '../../utils/nest-ast';

type MessageIds = 'credentialedWildcard';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

/** How an origin was written, when it accepts everything. */
function wildcardOrigin(node: TSESTree.Node): string | null {
  // `origin: true` — the cors middleware reflects the request's Origin header.
  if (isTrueLiteral(node)) return 'true';
  if (node.type === AST_NODE_TYPES.Literal && node.value === '*') return "'*'";
  if (node.type === AST_NODE_TYPES.ArrayExpression) {
    const wildcard = node.elements.some(
      (el) => el?.type === AST_NODE_TYPES.Literal && el.value === '*',
    );
    return wildcard ? "['*']" : null;
  }
  return null;
}

export const noPermissiveCors = createRule<RuleOptions, MessageIds>({
  name: 'no-permissive-cors',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/no-permissive-cors.md',
      description:
        'Detect CORS reflecting any origin while allowing credentials',
      cwe: 'CWE-942',
      cvss: 8.1,
    },
    messages: {
      credentialedWildcard: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Credentialed Wildcard CORS',
        cwe: 'CWE-942',
        cvss: 8.1,
        description:
          "origin: {{origin}} with credentials: true lets any website call this API with the visitor's session and read the response",
        severity: 'HIGH',
        fix: 'Replace the wildcard with an explicit allow-list of origins, or drop credentials: true',
        documentationLink: 'https://cwe.mitre.org/data/definitions/942.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context, [options = {}]) {
    const { allowInTests = true } = options;
    if (allowInTests && isTestFile(context.filename)) return {};

    return {
      /**
       * Any object literal carrying both `origin` and `credentials` is CORS
       * options — that pair does not occur together on anything else in a Nest
       * application. Matching the object rather than the call site catches the
       * common indirection of declaring `const corsOptions: CorsOptions = {…}`
       * in one file and passing it to `enableCors` in another.
       */
      ObjectExpression(node: TSESTree.ObjectExpression) {
        const props = objectProperties(node);
        if (!props) return;
        const originValue = props.get('origin');
        if (!originValue || !isTrueLiteral(props.get('credentials'))) return;

        const origin = wildcardOrigin(originValue);
        if (!origin) return;

        context.report({
          node,
          messageId: 'credentialedWildcard',
          data: { origin },
        });
      },
    };
  },
});

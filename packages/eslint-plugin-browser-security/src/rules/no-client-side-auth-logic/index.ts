/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent authentication logic in client code
 */

import { createRule, formatLLMMessage, MessageIcons,
  nameHasAnyWord,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

/**
 * Is this operand a presence/flag constant rather than a credential?
 *
 * `if (ionFormField.secret === true)` is a *rendering* decision — okta's
 * `src/v2/ion/ui-schema/ion-string-handler.js:79` is asking whether to draw
 * the field as a password input — not an authentication decision. Nothing is
 * being authorised, and moving it to the server would be meaningless.
 *
 * The predicate was `does either side read .password/.secret/.token`, which
 * asks only what the property is NAMED. A credential comparison compares a
 * secret against a *value*; comparing one against `true`, `false`, `null` or
 * `undefined` tests whether the field exists or how it is flagged. The
 * genuine shape — `user.password === input` — is untouched.
 */
function isFlagComparand(node: TSESTree.Node): boolean {
  if (node.type === 'Literal') {
    return typeof node.value === 'boolean' || node.value === null;
  }
  return node.type === 'Identifier' && node.name === 'undefined';
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
/**
 * The default vocabulary, exported so consumers can extend rather than replace it.
 *
 * Matched by WHOLE WORD (see `nameHasAnyWord`), not substring — `role` used to
 * match `casserole`.
 */
export const DEFAULT_AUTH_KEYWORDS = [
  'admin',
  'authenticated',
  'authorized',
  'isAdmin',
  'isAuthenticated',
  'role',
] as const;

/**
 * The credential property names compared in a client-side password check.
 */
export const DEFAULT_CREDENTIAL_PROPERTIES = ['password', 'secret', 'token'] as const;

export interface Options {
  /**
   * Storage keys whose presence indicates a client-side authorization decision.
   * Matched whole-word against the key's camel/snake/kebab segments.
   * Default: {@link DEFAULT_AUTH_KEYWORDS}
   */
  authKeywords?: string[];

  /**
   * Property names treated as credentials in an equality comparison.
   * Matched exactly. Default: {@link DEFAULT_CREDENTIAL_PROPERTIES}
   */
  credentialProperties?: string[];
}

type RuleOptions = [Options?];

export const noClientSideAuthLogic = createRule<RuleOptions, MessageIds>({
  name: 'no-client-side-auth-logic',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-client-side-auth-logic.md',
      description: 'Prevent authentication logic in client code',
      cwe: 'CWE-602',
      cvss: 6.5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Client-Side Auth Logic',
        cwe: 'CWE-602',
        description: 'Authentication logic in client code - easily bypassed',
        severity: 'CRITICAL',
        fix: 'Move authentication checks to the server',
        documentationLink: 'https://cwe.mitre.org/data/definitions/602.html',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          authKeywords: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_AUTH_KEYWORDS],
            description:
              'Storage keys indicating a client-side authorization decision, ' +
              'matched whole-word against the key segments.',
          },
          credentialProperties: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_CREDENTIAL_PROPERTIES],
            description:
              'Property names treated as credentials in an equality comparison.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      authKeywords: [...DEFAULT_AUTH_KEYWORDS],
      credentialProperties: [...DEFAULT_CREDENTIAL_PROPERTIES],
    },
  ],
  create(context, [options = {}]) {
    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }
    
    // A vocabulary the consumer cannot reach is a vocabulary they must accept
    // whole — and every word list is wrong for somebody's domain.
    const {
      authKeywords = [...DEFAULT_AUTH_KEYWORDS],
      credentialProperties = [...DEFAULT_CREDENTIAL_PROPERTIES],
    } = options;
    
    return {
      IfStatement(node: TSESTree.IfStatement) {
        // Detect role/auth checks from localStorage
        if (node.test.type === 'CallExpression' &&
            node.test.callee.type === 'MemberExpression' &&
            node.test.callee.object.type === 'Identifier' &&
            node.test.callee.object.name === 'localStorage' &&
            node.test.callee.property.type === 'Identifier' &&
            node.test.callee.property.name === 'getItem') {
          
          const keyArg = node.test.arguments[0];
          if (keyArg && keyArg.type === 'Literal') {
            // NOT lowercased. `nameHasAnyWord` segments on camelCase, and
            // lowercasing first destroys the only boundary in `isAdmin` —
            // "isadmin" has no word break, so `admin` stops matching and the
            // rule goes silent on its single most important key. The helper
            // lowercases each segment itself.
            const key = String(keyArg.value);
            // WHOLE WORD, not substring. `key.includes('role')` reported
            // `localStorage.getItem("recipe-casserole-draft")` — `role` lives
            // inside `casserole` — and this rule ships at `error` in
            // `recommended`, so that finding reached every consumer of the
            // preset with a CRITICAL severity and no way to configure it away.
            //
            // `nameHasAnyWord` segments the key on camel/snake/kebab/digit
            // boundaries, so `isAdmin`, `user-role` and `auth_token` still
            // match while `casserole` and `authorship` no longer do.
            if (nameHasAnyWord(key, authKeywords)) {
              report(node);
            }
          }
        }
        
        // Detect password comparison
        if (node.test.type === 'BinaryExpression') {
          // oxlint-disable-next-line consistent-function-scoping
          const checkMember = (expr: TSESTree.Expression) => {
            if (expr.type === 'MemberExpression' && 
                expr.property.type === 'Identifier' &&
                credentialProperties.includes(expr.property.name)) {
              return true;
            }
            return false;
          };
          
          const left = node.test.left as TSESTree.Expression;
          const right = node.test.right as TSESTree.Expression;
          const leftIsCredential = checkMember(left);

          if (leftIsCredential || checkMember(right)) {
            // The value the credential is measured against. When both sides
            // read a credential, either one answers.
            const comparand = leftIsCredential ? right : left;
            if (!isFlagComparand(comparand)) {
              report(node);
            }
          }
        }
      },
    };
  },
});

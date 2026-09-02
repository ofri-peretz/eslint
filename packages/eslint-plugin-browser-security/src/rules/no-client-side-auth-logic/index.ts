/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent authentication logic in client code
 */

import {
  createRule,
  formatLLMMessage,
  MessageIcons,
  nameHasAnyWord,
  namesOneOf,
  propertyName,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';
import { isGlobalObject } from '../../utils/global-object';
import {
  resolveInitializer,
  resolveStringKey,
} from '../../utils/resolve-binding';

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
export const DEFAULT_CREDENTIAL_PROPERTIES = [
  'password',
  'secret',
  'token',
] as const;

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
      }),
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

    const { sourceCode } = context;

    /**
     * Web-storage globals. `sessionStorage` is the same trust boundary as
     * `localStorage` — it just expires sooner — and matching only the bare
     * `localStorage` identifier meant `window.localStorage.getItem('isAdmin')`,
     * the spelling every implicit-globals lint rule asks for, was silent.
     */
    const STORAGES: ReadonlySet<string> = new Set([
      'localStorage',
      'sessionStorage',
    ]);

    /**
     * Is this expression a read of a storage key that names an authorization
     * decision?
     *
     * The key is RESOLVED before it is matched, because a codebase with more
     * than one key holds them in constants — `getItem(ROLE_KEY)` was invisible
     * to a check that required a `Literal` argument.
     */
    function isAuthStorageRead(node: TSESTree.Node): boolean {
      if (node.type !== 'CallExpression') return false;
      const callee = node.callee;
      if (
        callee.type !== 'MemberExpression' ||
        // `localStorage['getItem']('isAdmin')` reads the same flag.
        propertyName(callee) !== 'getItem' ||
        !isGlobalObject(callee.object, STORAGES)
      ) {
        return false;
      }
      const keyArg = node.arguments[0];
      if (keyArg === undefined || keyArg.type === 'SpreadElement') return false;
      const key = resolveStringKey(keyArg, sourceCode);
      if (key === null) return false;
      // NOT lowercased first. `nameHasAnyWord` segments on camelCase, and
      // lowercasing destroys the only boundary in `isAdmin` — "isadmin" has no
      // word break, so `admin` would stop matching and the rule would go
      // silent on its single most important key.
      //
      // WHOLE WORD, not substring. `key.includes('role')` reported
      // `localStorage.getItem("recipe-casserole-draft")`, and this rule ships
      // at `error` in `recommended`, so that finding reached every consumer of
      // the preset at CRITICAL severity with no way to configure it away.
      return nameHasAnyWord(key, authKeywords);
    }

    /**
     * Does this `if` test READ an auth flag out of storage, anywhere in it?
     *
     * `if (localStorage.getItem('isAdmin'))` and
     * `if (localStorage.getItem('isAdmin') === 'true')` are the same decision;
     * `getItem` returns a string, so the second is the idiomatic spelling and
     * the one a bare-call check could not see.
     */
    function testReadsAuthStorage(node: TSESTree.Node, depth = 0): boolean {
      if (depth > 6) return false;
      if (isAuthStorageRead(node)) return true;
      switch (node.type) {
        case 'UnaryExpression':
          return testReadsAuthStorage(node.argument, depth + 1);
        case 'BinaryExpression':
        case 'LogicalExpression':
          return (
            testReadsAuthStorage(node.left as TSESTree.Node, depth + 1) ||
            testReadsAuthStorage(node.right, depth + 1)
          );
        case 'Identifier': {
          // `const canPurge = sessionStorage.getItem('role') && …; if (canPurge)`
          // — naming the decision does not move it off the client. Resolved
          // through scope, so a DIFFERENT `canPurge` in another block cannot
          // be mistaken for this one.
          const init = resolveInitializer(node, sourceCode);
          return init !== undefined && testReadsAuthStorage(init, depth + 1);
        }
        default:
          return false;
      }
    }

    /**
     * `user.password === entered` — a credential measured against a value.
     *
     * Exact property membership against a configurable list; the comparand
     * decides whether it is a credential check at all, because
     * `field.secret === true` is a rendering flag and not an authentication.
     */
    function isCredentialComparison(test: TSESTree.Node): boolean {
      if (test.type !== 'BinaryExpression') return false;
      const isCredentialRead = (expr: TSESTree.Node): boolean =>
        expr.type === 'MemberExpression' &&
        namesOneOf(propertyName(expr), credentialProperties);

      const left = test.left as TSESTree.Node;
      const right = test.right as TSESTree.Node;
      const leftIsCredential = isCredentialRead(left);
      if (!leftIsCredential && !isCredentialRead(right)) return false;
      // The value the credential is measured against. When both sides read a
      // credential, either one answers.
      return !isFlagComparand(leftIsCredential ? right : left);
    }

    /**
     * The decision, wherever it is spelled.
     *
     * One report per branch — falling through would give
     * `if (localStorage.getItem('role') === user.role)` two findings for one
     * line, and this package has already shipped a test pinning exactly that
     * as correct.
     */
    function checkBranch(node: TSESTree.Node, test: TSESTree.Node) {
      if (testReadsAuthStorage(test) || isCredentialComparison(test)) {
        report(node);
      }
    }

    return {
      IfStatement(node: TSESTree.IfStatement) {
        checkBranch(node, node.test);
      },
      // React gates render with a ternary far more often than with an `if`.
      // Visiting only `IfStatement` made every
      // `localStorage.getItem('isAdmin') ? <DangerZone/> : null` invisible —
      // the single most common spelling of CWE-602 in a component tree.
      ConditionalExpression(node: TSESTree.ConditionalExpression) {
        checkBranch(node, node.test);
      },
    };
  },
});

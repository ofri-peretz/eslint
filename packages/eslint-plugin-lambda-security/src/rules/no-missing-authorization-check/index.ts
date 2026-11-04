/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-missing-authorization-check
 * Detects Lambda handlers without authorization checks
 * CWE-862: Missing Authorization
 *
 * @see https://cwe.mitre.org/data/definitions/862.html
 * @see https://owasp.org/www-project-serverless-top-10/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileIsLambda } from '../../utils/lambda-evidence';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
  memberPath,
  propertyName,
} from '@interlace/eslint-devkit';

type MessageIds = 'missingAuthCheck';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Handler file patterns to check. Default: common Lambda patterns */
  handlerPatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * Where an authorizer's verdict lives on the event, or the credential a
 * handler verifies itself: `requestContext.authorizer` (Cognito, JWT, Lambda
 * authorizers), the `Authorization` header.
 */
const AUTHORIZATION_SEGMENTS = new Set(['authorizer', 'authorization']);

/**
 * Identity fields, read off whatever established the caller (`claims.sub`,
 * `user.isAdmin`). Matched as the WHOLE property name: the previous
 * substring test took `body.subject` for `sub` and `submit` for an auth check.
 */
const IDENTITY_FIELDS = new Set([
  'claims',
  'principalId',
  'isAdmin',
  'isAuthenticated',
  'userId',
  'sub',
  'scope',
  'permissions',
]);

/**
 * Event properties the CLIENT writes. An identity field read out of these —
 * `event.pathParameters.userId`, `body.userId` — is the caller's claim about
 * itself, the very thing authorization exists to check.
 */
// @vocabulary AWS API Gateway proxy event: client-supplied fields
const CLIENT_INPUT = new Set([
  'body',
  'pathParameters',
  'queryStringParameters',
  'multiValueQueryStringParameters',
]);

// Sensitive operations that require authorization
const SENSITIVE_OPERATIONS = new Set([
  // Database operations
  'query',
  'put',
  'delete',
  'update',
  'insert',
  'remove',
  'create',
  // AWS SDK operations
  'send',
  'invoke',
  'putObject',
  'deleteObject',
  'getObject',
  'putItem',
  'deleteItem',
  'updateItem',
  'getItem',
]);

// Standard-library namespaces. `Object.create`, `Reflect.deleteProperty`
// share a name with a data operation but touch nothing outside the process.
const BUILTIN_NAMESPACES = new Set([
  'Object',
  'Reflect',
  'JSON',
  'Math',
  'Array',
  'Promise',
  'Atomics',
]);

// In-process collections: `cache.delete(key)` on `new Map()` is not a
// resource anyone needs permission to reach.
const IN_PROCESS_COLLECTIONS = new Set(['Map', 'Set', 'WeakMap', 'WeakSet']);

// Event parameter names
const EVENT_PARAM_NAMES = new Set(['event', 'evt', 'e', 'request', 'req']);

export const noMissingAuthorizationCheck = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-authorization-check',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-lambda-security/docs/rules/no-missing-authorization-check.md',
      description: 'Detects Lambda handlers without authorization checks',
      cwe: 'CWE-862',
      cvss: 7.5,
    },
    messages: {
      missingAuthCheck: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Authorization Check',
        cwe: 'CWE-862',
        cvss: 7.5,
        description:
          'Lambda handler performs {{operation}} operation without authorization check. Users may access resources without proper permissions.',
        severity: 'HIGH',
        fix: 'Add authorization check: const claims = event.requestContext.authorizer?.claims; if (!claims?.sub) { return { statusCode: 401 } }',
        documentationLink: 'https://cwe.mitre.org/data/definitions/862.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
            description: 'Allow missing auth in test files',
          },
          handlerPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Handler file patterns to check',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: true,
      handlerPatterns: [],
    },
  ],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let currentFunctionNode:
      | TSESTree.ArrowFunctionExpression
      | TSESTree.FunctionExpression
      | TSESTree.FunctionDeclaration
      | null;
    let hasAuthCheck: boolean;
    let hasEventParameter: boolean;
    let sensitiveOperations: {
      node: TSESTree.CallExpression;
      operation: string;
    }[];

    /**
     * Reset state when entering a new function
     */
    function enterFunction(
      node:
        | TSESTree.ArrowFunctionExpression
        | TSESTree.FunctionExpression
        | TSESTree.FunctionDeclaration,
    ) {
      // Check if this function has an event parameter
      const hasEvent = node.params.some(
        (param) =>
          param.type === AST_NODE_TYPES.Identifier &&
          EVENT_PARAM_NAMES.has(param.name),
      );

      if (hasEvent) {
        currentFunctionNode = node;
        hasAuthCheck = false;
        hasEventParameter = true;
        sensitiveOperations.length = 0;
      }
    }

    /**
     * Check and report on function exit
     */
    function exitFunction(
      node:
        | TSESTree.ArrowFunctionExpression
        | TSESTree.FunctionExpression
        | TSESTree.FunctionDeclaration,
    ) {
      if (currentFunctionNode !== node) return;

      // Report if we have sensitive operations without auth check
      if (hasEventParameter && !hasAuthCheck) {
        for (const { node: opNode, operation } of sensitiveOperations) {
          context.report({
            node: opNode,
            messageId: 'missingAuthCheck',
            data: { operation },
          });
        }
      }

      currentFunctionNode = null;
      hasEventParameter = false;
    }

    /**
     * Check if a member expression chain indicates auth check
     */
    function isAuthorizationAccess(node: TSESTree.MemberExpression): boolean {
      const path = memberPath(node);
      if (path === null) return false;
      const clientInput = isClientInput(node, path);
      if (
        path.some((p) => AUTHORIZATION_SEGMENTS.has(p.toLowerCase())) &&
        !clientInput
      ) {
        return true;
      }
      // IAM authorization: `event.requestContext.identity.userArn`.
      if (
        path.some(
          (p, i) => p === 'requestContext' && path[i + 1] === 'identity',
        )
      ) {
        return true;
      }
      return IDENTITY_FIELDS.has(path[path.length - 1]) && !clientInput;
    }

    /**
     * Whether a member chain reads client input: through a client-written
     * event field (`event.pathParameters.userId`), or off a local that was
     * initialised from one (`const payload = JSON.parse(event.body)` then
     * `payload.userId`). The local's NAME says nothing; its initialiser does.
     */
    function isClientInput(
      node: TSESTree.MemberExpression,
      path: string[],
    ): boolean {
      if (path.some((p) => CLIENT_INPUT.has(p))) return true;
      let root: TSESTree.Node = node;
      while (root.type === AST_NODE_TYPES.MemberExpression) root = root.object;
      const variable = context.sourceCode
        .getScope(root)
        .references.find((r) => r.identifier === root)?.resolved;
      const def = variable?.defs[0];
      let init: TSESTree.Node | null | undefined =
        def?.node.type === AST_NODE_TYPES.VariableDeclarator
          ? def.node.init
          : null;
      // JSON.parse(event.body ?? '{}')
      if (
        init?.type === AST_NODE_TYPES.CallExpression &&
        init.arguments.length > 0
      ) {
        init = init.arguments[0];
      }
      if (init?.type === AST_NODE_TYPES.LogicalExpression) init = init.left;
      const source = init ? memberPath(init) : null;
      return source !== null && source.some((p) => CLIENT_INPUT.has(p));
    }

    /**
     * Whether the receiver is a standard-library namespace, or a binding
     * initialised with `new Map()` / `new Set()` / … — nothing a caller needs
     * authorization to reach, whatever the method is called.
     */
    function isInProcessReceiver(receiver: TSESTree.Node): boolean {
      if (receiver.type !== AST_NODE_TYPES.Identifier) return false;
      let scope: ReturnType<typeof context.sourceCode.getScope> | null =
        context.sourceCode.getScope(receiver);
      while (scope) {
        const variable = scope.set.get(receiver.name);
        // typescript-eslint declares the lib globals (`Object`, `Map`, …) as
        // variables with no definitions; those are globals, not bindings.
        if (variable && variable.defs.length > 0) {
          const def = variable.defs[0];
          const init =
            variable.defs.length === 1 &&
            def.node.type === AST_NODE_TYPES.VariableDeclarator
              ? def.node.init
              : null;
          return (
            init?.type === AST_NODE_TYPES.NewExpression &&
            init.callee.type === AST_NODE_TYPES.Identifier &&
            IN_PROCESS_COLLECTIONS.has(init.callee.name)
          );
        }
        scope = scope.upper;
      }
      // Unbound: a global. Only the standard namespaces are known to be local.
      return BUILTIN_NAMESPACES.has(receiver.name);
    }

    /**
     * Check if call is a sensitive operation
     */
    function getSensitiveOperationName(
      node: TSESTree.CallExpression,
    ): string | null {
      if (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        !isInProcessReceiver(node.callee.object)
      ) {
        // `db['deleteItem'](…)` is the same sensitive operation.
        const operation = propertyName(node.callee);
        if (operation !== null && SENSITIVE_OPERATIONS.has(operation)) {
          return operation;
        }
      }
      return null;
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        // Every rule here is Lambda-specific, and none of them knew it: over 107,382
        // files, 98% of this plugin's findings were in files with no AWS anything.
        // Registering no visitors is both the gate and the cheap path.
        if (!fileIsLambda(context.sourceCode.ast)) return false;

        const { allowInTests = true, handlerPatterns = [] } =
          options as Options;
        const filename = context.filename;
        const isTestFile = isTestFilePath(filename);

        if (allowInTests && isTestFile) {
          return false;
        }
        // Set, the option limits the rule to the handler files it names.
        if (
          handlerPatterns.length > 0 &&
          !handlerPatterns.some((pattern) => filename.includes(pattern))
        ) {
          return false;
        }

        // Track state within each handler function
        currentFunctionNode = null;
        hasAuthCheck = false;
        hasEventParameter = false;
        sensitiveOperations = [];
        return true;
      },
      'ArrowFunctionExpression, FunctionExpression, FunctionDeclaration'(
        node:
          | TSESTree.ArrowFunctionExpression
          | TSESTree.FunctionExpression
          | TSESTree.FunctionDeclaration,
      ) {
        enterFunction(node);
      },

      'ArrowFunctionExpression:exit'(node: TSESTree.ArrowFunctionExpression) {
        exitFunction(node);
      },
      'FunctionExpression:exit'(node: TSESTree.FunctionExpression) {
        exitFunction(node);
      },
      'FunctionDeclaration:exit'(node: TSESTree.FunctionDeclaration) {
        exitFunction(node);
      },

      // Detect authorization checks
      MemberExpression(node: TSESTree.MemberExpression) {
        if (!currentFunctionNode) return;

        if (isAuthorizationAccess(node)) {
          hasAuthCheck = true;
        }
      },

      // Track sensitive operations
      CallExpression(node: TSESTree.CallExpression) {
        if (!currentFunctionNode) return;

        const operation = getSensitiveOperationName(node);
        if (operation) {
          sensitiveOperations.push({ node, operation });
        }
      },

      // Detect early returns (401/403) as auth checks
      ReturnStatement(node: TSESTree.ReturnStatement) {
        if (!currentFunctionNode) return;

        if (node.argument?.type === AST_NODE_TYPES.ObjectExpression) {
          for (const prop of node.argument.properties) {
            if (
              prop.type === AST_NODE_TYPES.Property &&
              prop.key.type === AST_NODE_TYPES.Identifier &&
              prop.key.name === 'statusCode' &&
              prop.value.type === AST_NODE_TYPES.Literal &&
              (prop.value.value === 401 || prop.value.value === 403)
            ) {
              hasAuthCheck = true;
            }
          }
        }
      },
    };
  },
});

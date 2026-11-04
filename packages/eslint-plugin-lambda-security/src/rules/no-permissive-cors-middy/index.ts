/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-permissive-cors-middy
 * Detects @middy/http-cors middleware with permissive origin configuration
 * CWE-942: Permissive Cross-domain Policy with Untrusted Domains
 *
 * @see https://cwe.mitre.org/data/definitions/942.html
 * @see https://middy.js.org/docs/middlewares/http-cors
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
  objectKeyName,
  staticString,
} from '@interlace/eslint-devkit';
import { fileIsLambda } from '../../utils/lambda-evidence';

type MessageIds = 'permissiveCors';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noPermissiveCorsMidly = createRule<RuleOptions, MessageIds>({
  name: 'no-permissive-cors-middy',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-lambda-security/docs/rules/no-permissive-cors-middy.md',
      description:
        'Detects @middy/http-cors middleware with permissive origin (*)',
      cwe: 'CWE-942',
      cvss: 7.5,
    },
    messages: {
      permissiveCors: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Permissive CORS in Middy',
        cwe: 'CWE-942',
        description:
          'Wildcard CORS origin in @middy/http-cors allows any domain',
        severity: 'HIGH',
        fix: 'Use specific origins: httpCors({ origins: ["https://your-domain.com"] })',
        documentationLink: 'https://middy.js.org/docs/middlewares/http-cors',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    /** Where a binding was imported or required from, if it was. */
    function moduleOf(id: TSESTree.Identifier): string | null | undefined {
      for (
        let scope: TSESLint.Scope.Scope | null =
          context.sourceCode.getScope(id);
        scope;
        scope = scope.upper
      ) {
        const variable = scope.set.get(id.name);
        if (!variable || variable.defs.length === 0) continue;
        const def = variable.defs[0];
        if (def.type === 'ImportBinding') {
          return staticString(
            (def.parent as TSESTree.ImportDeclaration).source,
          );
        }
        const init =
          def.node.type === AST_NODE_TYPES.VariableDeclarator
            ? def.node.init
            : null;
        return init?.type === AST_NODE_TYPES.CallExpression &&
          init.callee.type === AST_NODE_TYPES.Identifier &&
          init.callee.name === 'require'
          ? staticString(init.arguments[0])
          : null;
      }
      return undefined;
    }

    /**
     * Whether a call is the `@middy/http-cors` middleware.
     *
     * Decided by where the callee comes from, under whatever name it is
     * imported: `import corsMiddleware from '@middy/http-cors'` was invisible to
     * the old name test, and a project's own `./cors` helper was reported.
     * An undeclared `cors` / `httpCors` keeps the name reading.
     */
    function isCorsMiddlewareCall(node: TSESTree.CallExpression): boolean {
      if (node.callee.type !== AST_NODE_TYPES.Identifier) return false;
      const source = moduleOf(node.callee);
      if (source === undefined) {
        const name = node.callee.name.toLowerCase();
        return name === 'httpcors' || name === 'cors';
      }
      return source === '@middy/http-cors';
    }

    /**
     * Check cors options for permissive origin
     */
    function checkCorsOptions(
      node: TSESTree.CallExpression,
      optionsObj: TSESTree.ObjectExpression,
    ): void {
      for (const prop of optionsObj.properties) {
        if (prop.type !== AST_NODE_TYPES.Property) continue;

        // Check for 'origin' or 'origins' property, however the key is spelled
        const keyName = objectKeyName(prop)?.toLowerCase();
        if (keyName === 'origin' || keyName === 'origins') {
          // A wildcard string, or a wildcard among an array's entries
          const values =
            prop.value.type === AST_NODE_TYPES.ArrayExpression
              ? prop.value.elements
              : [prop.value];
          for (const value of values) {
            if (staticString(value) === '*') {
              context.report({
                node: value === prop.value ? prop : (value as TSESTree.Node),
                messageId: 'permissiveCors',
              });
            }
          }
        }
      }
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        // Every rule here is Lambda-specific, and none of them knew it: over 107,382
        // files, 98% of this plugin's findings were in files with no AWS anything.
        // Registering no visitors is both the gate and the cheap path.
        if (!fileIsLambda(context.sourceCode.ast)) return false;

        const { allowInTests = true } = options as Options;
        const filename = context.filename;
        const isTestFile = isTestFilePath(filename);

        if (allowInTests && isTestFile) {
          return false;
        }
        return true;
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (!isCorsMiddlewareCall(node)) return;

        // httpCors() with no arguments defaults to permissive
        if (node.arguments.length === 0) {
          context.report({
            node,
            messageId: 'permissiveCors',
          });
          return;
        }

        // Check options object
        if (node.arguments[0]?.type === AST_NODE_TYPES.ObjectExpression) {
          checkCorsOptions(node, node.arguments[0]);
        }
      },
    };
  },
});

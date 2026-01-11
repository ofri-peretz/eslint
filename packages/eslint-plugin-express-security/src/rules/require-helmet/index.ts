/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-helmet
 * Detects Express.js applications missing helmet middleware for security headers
 * CWE-693: Protection Mechanism Failure
 *
 * @see https://cwe.mitre.org/data/definitions/693.html
 * @see https://helmetjs.github.io/
 * @see https://owasp.org/www-project-secure-headers/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
} from '@interlace/eslint-devkit';

type MessageIds = 'missingHelmet' | 'addHelmet';

export interface Options {
  /** Allow missing helmet in test files. Default: false */
  allowInTests?: boolean;

  /** Alternative security headers middleware names to accept. Default: [] */
  alternativeMiddleware?: string[];

  /** Skip rule if helmet/security headers are provided elsewhere (e.g., reverse proxy). Default: false */
  assumeHelmetMiddleware?: boolean;
}

type RuleOptions = [Options?];

/**
 * Check if a node is an app.use() call with helmet
 */
function isHelmetMiddleware(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;

  // Check for app.use(helmet()) or app.use(helmet.contentSecurityPolicy())
  if (callee.type !== 'MemberExpression') {
    return false;
  }

  if (
    callee.property.type !== 'Identifier' ||
    callee.property.name !== 'use'
  ) {
    return false;
  }

  // Check arguments for helmet usage
  for (const arg of node.arguments) {
    if (arg.type === 'CallExpression') {
      const argCallee = arg.callee;

      // helmet()
      if (argCallee.type === 'Identifier' && argCallee.name === 'helmet') {
        return true;
      }

      // helmet.contentSecurityPolicy() etc.
      if (
        argCallee.type === 'MemberExpression' &&
        argCallee.object.type === 'Identifier' &&
        argCallee.object.name === 'helmet'
      ) {
        return true;
      }
    }

    // app.use(helmet) without call (unlikely but possible)
    /* c8 ignore next 3 */
    if (arg.type === 'Identifier' && arg.name === 'helmet') {
      return true;
    }
  }

  return false;
}

/**
 * Check if middleware is an alternative security headers middleware
 */
function isAlternativeMiddleware(
  node: TSESTree.CallExpression,
  alternatives: string[]
): boolean {
  for (const arg of node.arguments) {
    if (arg.type === 'CallExpression' && arg.callee.type === 'Identifier') {
      if (alternatives.includes(arg.callee.name)) {
        return true;
      }
    }
    /* c8 ignore next 3 */
    if (arg.type === 'Identifier' && alternatives.includes(arg.name)) {
      return true;
    }
  }
  return false;
}

export const requireHelmet = createRule<RuleOptions, MessageIds>({
  name: 'require-helmet',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require helmet middleware for security headers in Express.js applications',
    },
    hasSuggestions: true,
    messages: {
      missingHelmet: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Security Headers',
        cwe: 'CWE-693',
        description:
          'Express app created without helmet middleware. Missing security headers: X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.',
        severity: 'HIGH',
        fix: "Add helmet middleware: app.use(helmet()). Install with 'npm install helmet'.",
        documentationLink: 'https://helmetjs.github.io/',
      }),
      addHelmet: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Helmet',
        description: 'Add helmet middleware for security headers',
        severity: 'LOW',
        fix: "import helmet from 'helmet'; app.use(helmet());",
        documentationLink: 'https://helmetjs.github.io/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow missing helmet in test files',
          },
          alternativeMiddleware: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Alternative security headers middleware names to accept',
          },
          assumeHelmetMiddleware: {
            type: 'boolean',
            default: false,
            description:
              'Skip rule if security headers are provided elsewhere (e.g., reverse proxy)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      alternativeMiddleware: [],
      assumeHelmetMiddleware: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { allowInTests = false, alternativeMiddleware = [], assumeHelmetMiddleware = false } =
      options as Options;

    // Skip entirely if helmet/security headers are assumed to be provided elsewhere
    if (assumeHelmetMiddleware) {
      return {};
    }

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    // Track if we've seen express() call and helmet usage
    let hasExpressApp = false;
    let hasHelmet = false;
    let expressAppNode: TSESTree.CallExpression | null = null;

    return {
      // Detect express() app creation
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for express() call
        if (callee.type === 'Identifier' && callee.name === 'express') {
          hasExpressApp = true;
          expressAppNode = node;
          return;
        }

        // Check for require('express')() pattern
        /* c8 ignore next 15 */
        if (
          callee.type === 'CallExpression' &&
          callee.callee.type === 'Identifier' &&
          callee.callee.name === 'require'
        ) {
          const firstArg = callee.arguments[0];
          if (
            firstArg &&
            firstArg.type === 'Literal' &&
            firstArg.value === 'express'
          ) {
            hasExpressApp = true;
            expressAppNode = node;
            return;
          }
        }

        // Check for helmet middleware usage
        if (isHelmetMiddleware(node)) {
          hasHelmet = true;
          return;
        }

        // Check for alternative middleware
        if (isAlternativeMiddleware(node, alternativeMiddleware)) {
          hasHelmet = true;
          return;
        }
      },

      // Report at the end of the file if express app exists but no helmet
      'Program:exit'() {
        if (hasExpressApp && !hasHelmet && expressAppNode) {
          context.report({
            node: expressAppNode,
            messageId: 'missingHelmet',
            suggest: [
              {
                messageId: 'addHelmet',
                fix: () => null, // Manual fix required - need to add import and app.use()
              },
            ],
          });
        }
      },
    };
  },
});

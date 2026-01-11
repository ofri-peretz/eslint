/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-guards
 * Requires @UseGuards decorator on controllers or route handlers
 * CWE-284: Improper Access Control
 *
 * @see https://cwe.mitre.org/data/definitions/284.html
 * @see https://docs.nestjs.com/guards
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'missingGuards' | 'addGuards';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Guards to check for. Default: any guard */
  requiredGuards?: string[];
  /** Allow public endpoints (with @Public decorator). Default: true */
  allowPublicDecorator?: boolean;
  /** Skip rule if global guards are configured in main.ts. Default: false */
  assumeGlobalGuards?: boolean;
}

type RuleOptions = [Options?];

// HTTP method decorators that indicate route handlers
const HTTP_METHOD_DECORATORS = [
  'Get',
  'Post',
  'Put',
  'Patch',
  'Delete',
  'Options',
  'Head',
  'All',
];

// Decorators that bypass guard requirements
const PUBLIC_DECORATORS = ['Public', 'SkipAuth', 'AllowAnonymous', 'NoAuth'];

export const requireGuards = createRule<RuleOptions, MessageIds>({
  name: 'require-guards',
  meta: {
    type: 'problem',
    docs: {
      description: 'Requires @UseGuards decorator on controllers or route handlers',
    },
    hasSuggestions: true,
    messages: {
      missingGuards: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Authorization Guards',
        cwe: 'CWE-284',
        cvss: 9.8,
        description: 'Controller/route handler {{name}} lacks @UseGuards for access control',
        severity: 'CRITICAL',
        fix: 'Add @UseGuards(AuthGuard): @UseGuards(AuthGuard) before the handler',
        documentationLink: 'https://docs.nestjs.com/guards',
      }),
      addGuards: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Authentication Guard',
        description: 'Add @UseGuards decorator to protect this endpoint',
        severity: 'LOW',
        fix: 'import { UseGuards } from "@nestjs/common"; @UseGuards(AuthGuard)',
        documentationLink: 'https://docs.nestjs.com/guards',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          requiredGuards: { type: 'array', items: { type: 'string' }, default: [] },
          allowPublicDecorator: { type: 'boolean', default: true },
          assumeGlobalGuards: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, requiredGuards: [], allowPublicDecorator: true, assumeGlobalGuards: false }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { allowInTests = true, allowPublicDecorator = true, assumeGlobalGuards = false } = options as Options;

    // Skip entirely if global guards are assumed (configured in main.ts)
    if (assumeGlobalGuards) {
      return {};
    }
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    // Track if class has controller decorator and class-level guards
    let isController = false;
    let hasClassLevelGuards = false;

    /**
     * Check if decorators include @UseGuards
     */
    function hasUseGuardsDecorator(decorators: TSESTree.Decorator[] | undefined): boolean {
      if (!decorators) return false;
      return decorators.some((dec) => {
        if (dec.expression.type === AST_NODE_TYPES.CallExpression) {
          const callee = dec.expression.callee;
          return callee.type === AST_NODE_TYPES.Identifier && callee.name === 'UseGuards';
        }
        if (dec.expression.type === AST_NODE_TYPES.Identifier) {
          return dec.expression.name === 'UseGuards';
        }
        return false;
      });
    }

    /**
     * Check if decorators include public/skip decorators
     */
    function hasPublicDecorator(decorators: TSESTree.Decorator[] | undefined): boolean {
      if (!decorators || !allowPublicDecorator) return false;
      return decorators.some((dec) => {
        const name =
          dec.expression.type === AST_NODE_TYPES.Identifier
            ? dec.expression.name
            : dec.expression.type === AST_NODE_TYPES.CallExpression &&
              dec.expression.callee.type === AST_NODE_TYPES.Identifier
            ? dec.expression.callee.name
            : '';
        return PUBLIC_DECORATORS.includes(name);
      });
    }

    /**
     * Check if a method has HTTP method decorator (is a route handler)
     */
    function hasHttpMethodDecorator(
      decorators: TSESTree.Decorator[] | undefined
    ): string | null {
      if (!decorators) return null;
      for (const dec of decorators) {
        const name =
          dec.expression.type === AST_NODE_TYPES.Identifier
            ? dec.expression.name
            : dec.expression.type === AST_NODE_TYPES.CallExpression &&
              dec.expression.callee.type === AST_NODE_TYPES.Identifier
            ? dec.expression.callee.name
            : '';
        if (HTTP_METHOD_DECORATORS.includes(name)) {
          return name;
        }
      }
      return null;
    }

    /**
     * Check if class has @Controller decorator
     */
    function hasControllerDecorator(decorators: TSESTree.Decorator[] | undefined): boolean {
      if (!decorators) return false;
      return decorators.some((dec) => {
        const name =
          dec.expression.type === AST_NODE_TYPES.Identifier
            ? dec.expression.name
            : dec.expression.type === AST_NODE_TYPES.CallExpression &&
              dec.expression.callee.type === AST_NODE_TYPES.Identifier
            ? dec.expression.callee.name
            : '';
        return name === 'Controller';
      });
    }

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        // Reset tracking for new class
        isController = hasControllerDecorator(node.decorators);
        hasClassLevelGuards = hasUseGuardsDecorator(node.decorators);
      },

      MethodDefinition(node: TSESTree.MethodDefinition) {
        // Only check if we're in a controller and method is a route handler
        if (!isController) return;
        
        // Skip constructor and non-public methods
        if (
          node.key.type === AST_NODE_TYPES.Identifier &&
          (node.key.name === 'constructor' || node.key.name.startsWith('_'))
        ) {
          return;
        }

        const httpMethod = hasHttpMethodDecorator(node.decorators);
        if (!httpMethod) return;

        // Skip if has @Public or similar decorator
        if (hasPublicDecorator(node.decorators)) return;

        // Skip if class or method already has guards
        if (hasClassLevelGuards || hasUseGuardsDecorator(node.decorators)) return;

        const methodName =
          node.key.type === AST_NODE_TYPES.Identifier ? node.key.name : '<anonymous>';

        context.report({
          node,
          messageId: 'missingGuards',
          data: { name: methodName },
          suggest: [{ messageId: 'addGuards', fix: () => null }],
        });
      },
    };
  },
});

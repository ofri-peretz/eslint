/**
 * ESLint Rule: no-missing-validation-pipe
 * Requires ValidationPipe for DTO parameters
 * CWE-20: Improper Input Validation
 *
 * @see https://cwe.mitre.org/data/definitions/20.html
 * @see https://docs.nestjs.com/techniques/validation
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'missingValidation' | 'addValidationPipe';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Skip rule if global ValidationPipe is configured in main.ts. Default: false */
  assumeGlobalPipes?: boolean;
}

type RuleOptions = [Options?];

// Decorators that receive user input
const INPUT_DECORATORS = ['Body', 'Query', 'Param'];

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

export const noMissingValidationPipe = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-validation-pipe',
  meta: {
    type: 'problem',
    docs: {
      description: 'Requires ValidationPipe for DTO input parameters',
    },
    hasSuggestions: true,
    messages: {
      missingValidation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Input Validation',
        cwe: 'CWE-20',
        cvss: 8.6,
        description: 'Parameter {{param}} receives user input without ValidationPipe',
        severity: 'HIGH',
        fix: 'Add @UsePipes(ValidationPipe) or use global validation: app.useGlobalPipes(new ValidationPipe())',
        documentationLink: 'https://docs.nestjs.com/techniques/validation',
      }),
      addValidationPipe: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Validation Pipe',
        description: 'Add ValidationPipe to validate and transform input',
        severity: 'LOW',
        fix: 'import { ValidationPipe, UsePipes } from "@nestjs/common"; @UsePipes(new ValidationPipe())',
        documentationLink: 'https://docs.nestjs.com/techniques/validation',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          assumeGlobalPipes: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, assumeGlobalPipes: false }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { allowInTests = true, assumeGlobalPipes = false } = options as Options;

    // Skip entirely if global ValidationPipe is assumed (configured in main.ts)
    if (assumeGlobalPipes) {
      return {};
    }

    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    // Track if class/method has ValidationPipe
    let hasClassLevelPipe = false;
    let isController = false;

    /**
     * Check if decorators include @UsePipes with ValidationPipe
     */
    function hasValidationPipe(decorators: TSESTree.Decorator[] | undefined): boolean {
      if (!decorators) return false;
      return decorators.some((dec) => {
        if (dec.expression.type === AST_NODE_TYPES.CallExpression) {
          const callee = dec.expression.callee;
          if (callee.type === AST_NODE_TYPES.Identifier && callee.name === 'UsePipes') {
            // Check if ValidationPipe is in the arguments
            return dec.expression.arguments.some((arg) => {
              if (arg.type === AST_NODE_TYPES.Identifier && arg.name === 'ValidationPipe') {
                return true;
              }
              if (
                arg.type === AST_NODE_TYPES.NewExpression &&
                arg.callee.type === AST_NODE_TYPES.Identifier &&
                arg.callee.name === 'ValidationPipe'
              ) {
                return true;
              }
              return false;
            });
          }
        }
        return false;
      });
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

    /**
     * Check if method is a route handler
     */
    function isRouteHandler(decorators: TSESTree.Decorator[] | undefined): boolean {
      if (!decorators) return false;
      return decorators.some((dec) => {
        const name =
          dec.expression.type === AST_NODE_TYPES.Identifier
            ? dec.expression.name
            : dec.expression.type === AST_NODE_TYPES.CallExpression &&
              dec.expression.callee.type === AST_NODE_TYPES.Identifier
            ? dec.expression.callee.name
            : '';
        return HTTP_METHOD_DECORATORS.includes(name);
      });
    }

    /**
     * Get input decorator name from parameter decorators
     */
    function getInputDecorator(
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
        if (INPUT_DECORATORS.includes(name)) {
          return name;
        }
      }
      return null;
    }

    /**
     * Check if parameter has type annotation (indicating a DTO)
     */
    function hasTypeAnnotation(param: TSESTree.Parameter): boolean {
      // Parameters with type annotations suggest DTOs needing validation
      return (
        param.type === AST_NODE_TYPES.Identifier &&
        param.typeAnnotation !== undefined &&
        param.typeAnnotation.typeAnnotation.type !== AST_NODE_TYPES.TSStringKeyword &&
        param.typeAnnotation.typeAnnotation.type !== AST_NODE_TYPES.TSNumberKeyword &&
        param.typeAnnotation.typeAnnotation.type !== AST_NODE_TYPES.TSBooleanKeyword
      );
    }

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        isController = hasControllerDecorator(node.decorators);
        hasClassLevelPipe = hasValidationPipe(node.decorators);
      },

      MethodDefinition(node: TSESTree.MethodDefinition) {
        if (!isController) return;
        if (!isRouteHandler(node.decorators)) return;

        // Skip if class or method has ValidationPipe
        if (hasClassLevelPipe || hasValidationPipe(node.decorators)) return;

        // Check method parameters for @Body, @Query, @Param with type annotations
        if (node.value.type === AST_NODE_TYPES.FunctionExpression) {
          for (const param of node.value.params) {
            if (param.type !== AST_NODE_TYPES.Identifier) continue;

            const inputDecorator = getInputDecorator(param.decorators);
            if (!inputDecorator) continue;

            // Only flag if parameter has a complex type annotation (DTO)
            if (hasTypeAnnotation(param)) {
              const paramName = param.name;
              context.report({
                node: param,
                messageId: 'missingValidation',
                data: { param: `@${inputDecorator}() ${paramName}` },
                suggest: [{ messageId: 'addValidationPipe', fix: () => null }],
              });
            }
          }
        }
      },
    };
  },
});

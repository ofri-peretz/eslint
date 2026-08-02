/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

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
import {
  getDecoratorCall,
  getDecoratorName,
  getHttpMethodDecorator,
  isControllerClass,
} from '../../utils/decorators';
import { getProjectContext } from '../../utils/project-context';

type MessageIds = 'missingValidation' | 'addValidationPipe';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Skip rule entirely, without scanning the project. Default: false */
  assumeGlobalPipes?: boolean;
  /**
   * Suppress findings when the project registers a pipe globally via
   * `APP_PIPE` or `app.useGlobalPipes()`. Default: true
   */
  detectGlobalPipes?: boolean;
}

type RuleOptions = [Options?];

// Decorators that receive user input
const INPUT_DECORATORS = new Set(['Body', 'Query', 'Param']);

/** `@Body(new ValidationPipe())` / `@Param('id', ParseIntPipe)` are validated. */
const PIPE_NAME = /Pipe$/;

export const noMissingValidationPipe = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-validation-pipe',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/no-missing-validation-pipe.md',
      description: 'Requires ValidationPipe for DTO input parameters',
      cwe: 'CWE-20',
      cvss: 8.6,
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
          detectGlobalPipes: { type: 'boolean', default: true },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    { allowInTests: true, assumeGlobalPipes: false, detectGlobalPipes: true },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
      allowInTests = true,
      assumeGlobalPipes = false,
      detectGlobalPipes = true,
    } = options as Options;

    // Skip entirely if global ValidationPipe is assumed (configured in main.ts)
    if (assumeGlobalPipes) {
      return {};
    }

    const filename = context.filename;
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
            return dec.expression.arguments.some((arg: TSESTree.CallExpressionArgument) => {
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
     * The `@Body()` / `@Query()` / `@Param()` decorator of a parameter, or
     * `null` when the parameter does not receive user input.
     */
    function getInputDecorator(
      decorators: TSESTree.Decorator[] | undefined
    ): TSESTree.Decorator | null {
      if (!decorators) return null;
      for (const dec of decorators) {
        if (INPUT_DECORATORS.has(getDecoratorName(dec))) {
          return dec;
        }
      }
      return null;
    }

    /**
     * Parameter-level pipes validate the value at the binding site:
     * `@Body(new ValidationPipe())`, `@Param('id', ParseIntPipe)`,
     * `@Query('page', PaginationPipe)`.
     */
    function hasParameterPipe(decorator: TSESTree.Decorator): boolean {
      const call = getDecoratorCall(decorator);
      if (call === null) return false;
      return call.arguments.some((arg: TSESTree.CallExpressionArgument) => {
        if (arg.type === AST_NODE_TYPES.Identifier) {
          return PIPE_NAME.test(arg.name);
        }
        if (
          arg.type === AST_NODE_TYPES.NewExpression &&
          arg.callee.type === AST_NODE_TYPES.Identifier
        ) {
          return PIPE_NAME.test(arg.callee.name);
        }
        return false;
      });
    }

    /** A global `APP_PIPE` / `useGlobalPipes()` validates every route. */
    function hasProjectGlobalPipe(): boolean {
      return (
        detectGlobalPipes && getProjectContext(context).hasGlobalValidationPipe
      );
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
        isController = isControllerClass(node.decorators);
        hasClassLevelPipe = hasValidationPipe(node.decorators);
      },

      MethodDefinition(node: TSESTree.MethodDefinition) {
        if (!isController) return;
        if (getHttpMethodDecorator(node.decorators) === null) return;

        // Skip if class or method has ValidationPipe
        if (hasClassLevelPipe || hasValidationPipe(node.decorators)) return;

        // Check method parameters for @Body, @Query, @Param with type annotations
        if (node.value.type === AST_NODE_TYPES.FunctionExpression) {
          for (const param of node.value.params) {
            if (param.type !== AST_NODE_TYPES.Identifier) continue;

            const inputDecorator = getInputDecorator(param.decorators);
            if (inputDecorator === null) continue;

            // Only flag if parameter has a complex type annotation (DTO)
            if (!hasTypeAnnotation(param)) continue;
            // A pipe bound to the parameter already validates it
            if (hasParameterPipe(inputDecorator)) continue;
            // A globally registered pipe validates every route in the project
            if (hasProjectGlobalPipe()) return;

            context.report({
              node: param,
              messageId: 'missingValidation',
              data: {
                param: `@${getDecoratorName(inputDecorator)}() ${param.name}`,
              },
              suggest: [{ messageId: 'addValidationPipe', fix: () => null }],
            });
          }
        }
      },
    };
  },
});

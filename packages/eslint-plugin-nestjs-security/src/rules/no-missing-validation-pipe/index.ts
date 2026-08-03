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
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import {
  decoratorCall,
  decoratorName,
  enclosingClass,
  expressionName,
  findDecorator,
  INPUT_DECORATORS,
  isControllerClass,
  isRouteHandler,
  isTestFile,
} from '../../utils/nest-ast';

type MessageIds = 'missingValidation' | 'addValidationPipe';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Skip rule if global ValidationPipe is configured in main.ts. Default: false */
  assumeGlobalPipes?: boolean;
  /**
   * Require an explicit @UsePipes(ValidationPipe) on every route that binds a
   * DTO, rather than only flagging shapes a global pipe cannot validate.
   * Default: false.
   *
   * Most NestJS apps register `app.useGlobalPipes(new ValidationPipe())` or an
   * `APP_PIPE` provider — 5 of the 8 real applications we measured do — and a
   * global pipe validates `@Body() dto: CreateUserDto` perfectly well. Demanding
   * a per-route pipe on top of that reported ~465 correctly-validated handlers.
   * Enable this only if your project deliberately avoids global pipes.
   */
  requireExplicitPipe?: boolean;
}

type RuleOptions = [Options?];

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
        description:
          'Parameter {{param}} receives user input without ValidationPipe',
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
          requireExplicitPipe: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, assumeGlobalPipes: false }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      allowInTests = true,
      assumeGlobalPipes = false,
      requireExplicitPipe = false,
    } = options as Options;

    // Skip entirely if global ValidationPipe is assumed (configured in main.ts)
    if (assumeGlobalPipes) {
      return {};
    }

    if (allowInTests && isTestFile(context.filename)) {
      return {};
    }

    /**
     * Whether @UsePipes(...) on this node installs a ValidationPipe.
     * Accepts `ValidationPipe`, `new ValidationPipe(...)` and `common.ValidationPipe`.
     */
    function hasValidationPipe(
      decorators: TSESTree.Decorator[] | undefined,
    ): boolean {
      const dec = findDecorator(decorators, 'UsePipes');
      const call = dec ? decoratorCall(dec) : null;
      if (!call) return false;
      return call.arguments.some(
        (arg) => expressionName(arg) === 'ValidationPipe',
      );
    }

    /**
     * Type shapes that carry no runtime class, so a ValidationPipe — global or
     * local — has no metatype to validate against and passes the value straight
     * through. Dangerous regardless of how the project configures validation.
     */
    const UNVALIDATABLE_TYPES = new Set<string>([
      AST_NODE_TYPES.TSAnyKeyword,
      AST_NODE_TYPES.TSUnknownKeyword,
      AST_NODE_TYPES.TSObjectKeyword,
      AST_NODE_TYPES.TSTypeLiteral,
      AST_NODE_TYPES.TSMappedType,
    ]);

    /**
     * Whether a ValidationPipe could validate this parameter at all.
     * An absent annotation is the worst case: no metatype, nothing to check.
     */
    function isUnvalidatable(param: TSESTree.Identifier): boolean {
      const annotation = param.typeAnnotation?.typeAnnotation;
      if (!annotation) return true;
      return UNVALIDATABLE_TYPES.has(annotation.type);
    }

    /** Type nodes the framework already coerces, plus the nullish members. */
    const SCALAR_TYPES = new Set<string>([
      AST_NODE_TYPES.TSStringKeyword,
      AST_NODE_TYPES.TSNumberKeyword,
      AST_NODE_TYPES.TSBooleanKeyword,
      AST_NODE_TYPES.TSUndefinedKeyword,
      AST_NODE_TYPES.TSNullKeyword,
      AST_NODE_TYPES.TSLiteralType,
    ]);

    /**
     * Whether a parameter's declared type is a scalar the framework already
     * coerces. A DTO type — or *no* type at all — still needs a pipe.
     *
     * Unions are unwrapped, because `@Query('error') error: string | undefined`
     * is an optional scalar query parameter, not an unvalidated object.
     */
    function isScalarTyped(param: TSESTree.Identifier): boolean {
      const annotation = param.typeAnnotation?.typeAnnotation;
      if (!annotation) return false;
      if (annotation.type === AST_NODE_TYPES.TSUnionType) {
        return annotation.types.every((t) => SCALAR_TYPES.has(t.type));
      }
      return SCALAR_TYPES.has(annotation.type);
    }

    return {
      MethodDefinition(node: TSESTree.MethodDefinition) {
        const cls = enclosingClass(node);
        if (!cls || !isControllerClass(cls)) return;
        if (!isRouteHandler(node)) return;

        // Skip if class or method has ValidationPipe
        if (
          hasValidationPipe(cls.decorators) ||
          hasValidationPipe(node.decorators)
        )
          return;

        // TypeScript forbids decorating an overload, so a decorated route
        // handler always has a real body; both value shapes expose `params`.
        for (const param of node.value.params) {
          if (param.type !== AST_NODE_TYPES.Identifier) continue;

          const inputDecorator = findDecorator(
            param.decorators,
            INPUT_DECORATORS,
          );
          if (!inputDecorator) continue;

          // A parameter-scoped pipe (`@Body(new ValidationPipe())`) validates it.
          if (
            decoratorCall(inputDecorator)?.arguments.some(
              (arg) => expressionName(arg) === 'ValidationPipe',
            )
          ) {
            continue;
          }

          // Scalars are coerced by the framework.
          if (isScalarTyped(param)) continue;

          // By default only report what no ValidationPipe could have saved.
          // Opt into requireExplicitPipe to demand a per-route pipe as well.
          if (!requireExplicitPipe && !isUnvalidatable(param)) continue;

          context.report({
            node: param,
            messageId: 'missingValidation',
            data: {
              param: `@${decoratorName(inputDecorator)}() ${param.name}`,
            },
            suggest: [{ messageId: 'addValidationPipe', fix: () => null }],
          });
        }
      },
    };
  },
});

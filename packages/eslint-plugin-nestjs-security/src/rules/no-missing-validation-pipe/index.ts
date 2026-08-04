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
import { getProjectContext } from '../../utils/project-context';

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
  /**
   * Scan the project for a pipe registered app-wide via `APP_PIPE` or `app.useGlobalPipes()`,
   * and stay quiet when one is found. Default: true.
   *
   * The registration lives in a different file from the route, so a
   * single-file rule cannot see it — this is the cross-file scan that
   * makes the difference between silence and reporting a correctly
   * configured application.
   */
  detectGlobalPipes?: boolean;
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
          detectGlobalPipes: { type: 'boolean', default: true },
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
      detectGlobalPipes = true,
      requireExplicitPipe = false,
    } = options as Options;

    // Skip entirely if global ValidationPipe is assumed (configured in main.ts)
    if (assumeGlobalPipes) {
      return {};
    }

    if (allowInTests && isTestFile(context.filename)) {
      return {};
    }

    // The registration lives in another file, so this is the only way a
    // single-file rule can know it exists. Without it the rule reports every
    // route of a correctly-configured application.
    //
    // It suppresses per parameter, not per file. Returning early here also hid
    // `any`, `unknown`, `object`, type literals and unannotated inputs — the
    // shapes carrying no runtime metatype, which a global pipe passes straight
    // through exactly as a local one would. A global registration is evidence
    // about typed DTOs and about nothing else.
    const hasGlobalPipe =
      detectGlobalPipes && getProjectContext(context).hasGlobalValidationPipe;

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

    /** Built-ins that coerce a scalar and cannot validate a DTO's shape. */
    const TRANSFORM_ONLY_PIPE = /^(Parse\w*Pipe|DefaultValuePipe)$/;

    /**
     * Whether a parameter decorator carries a pipe.
     *
     * `@Body()` / `@Body('key')` do not; `@Body(SomePipe)`,
     * `@Body(new ValidationPipe())` and `@Body('key', SomePipe)` do. The first
     * argument is a property key only when it is a string literal, so anything
     * else in that position — and anything at all after it — is a pipe.
     *
     * The built-in `Parse*Pipe` family is excluded: it coerces one scalar and
     * cannot check a DTO's shape, so `@Body(new ParseIntPipe()) dto: CreateDto`
     * is still unvalidated. Every other pipe is assumed to do its job — NestJS's
     * own samples pass `@Param('id', UserByIdPipe)`, which resolves the id to an
     * entity and throws when it cannot.
     */
    function hasParameterPipe(decorator: TSESTree.Decorator): boolean {
      const args = decoratorCall(decorator)?.arguments ?? [];
      return args.some((arg, index) => {
        const isPropertyKey =
          index === 0 &&
          arg.type === AST_NODE_TYPES.Literal &&
          typeof arg.value === 'string';
        if (isPropertyKey) return false;
        return !TRANSFORM_ONLY_PIPE.test(expressionName(arg));
      });
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

          // A parameter-scoped pipe validates or transforms the value, and it
          // does not have to be *the* ValidationPipe to do so.
          // `@Param('id', UserByIdPipe)` resolves the id to an entity and
          // throws when it cannot — NestJS's own samples spell it that way,
          // and matching the literal name `ValidationPipe` reported every one
          // of them. Any argument past the property key is a pipe: that is
          // what the parameter decorator's signature means.
          if (hasParameterPipe(inputDecorator)) continue;

          // Scalars are coerced by the framework.
          if (isScalarTyped(param)) continue;

          // A global pipe validates a typed DTO wherever it is declared — but
          // it has no metatype to validate an unvalidatable shape against.
          if (hasGlobalPipe && !isUnvalidatable(param)) continue;

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

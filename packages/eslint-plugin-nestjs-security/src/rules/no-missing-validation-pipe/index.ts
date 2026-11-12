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
  objectKeyName,
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
  staticString,
} from '@interlace/eslint-devkit';
import {
  decoratorCall,
  decoratorName,
  enclosingClass,
  expressionName,
  findDecorator,
  INPUT_DECORATORS,
  isControllerClass,
  isModuleExport,
  isRouteHandler,
} from '../../utils/nest-ast';
import { getProjectContext } from '../../utils/project-context';
import {
  hasParserServices,
  getParserServices,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';
import type ts from 'typescript';
import { loadTypeScript } from '../../utils/typescript-peer';
import { fileUsesNestjs } from '../../utils/nestjs-evidence';

type MessageIds = 'missingValidation' | 'undecoratedDto' | 'schemaWithoutPipe';

/** `app.useGlobalPipes(…)` or an `APP_PIPE` provider — the project scan's own test. */
const GLOBAL_PIPE_REGISTRATION = /\buseGlobalPipes\s*\(|\bAPP_PIPE\b/;

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

/** A route parameter this rule reads: a named binding or a destructured object. */
type InputParam = TSESTree.Identifier | TSESTree.ObjectPattern;

/** How a parameter is named in a message. */
function paramLabel(param: InputParam): string {
  if (param.type === AST_NODE_TYPES.Identifier) return param.name;
  const names = param.properties.map((p) =>
    p.type === AST_NODE_TYPES.Property &&
    p.value.type === AST_NODE_TYPES.Identifier
      ? p.value.name
      : '…',
  );
  return `{ ${names.join(', ')} }`;
}

/**
 * The type checker and the TypeScript module, when the file was parsed with
 * type information; null otherwise.
 *
 * Type information is optional. Without `parserOptions.project` the rule keeps
 * its syntax-only behaviour exactly; with it, one more question becomes
 * answerable. TypeScript is loaded lazily, only once parser services exist,
 * so the emitted output carries no top-level `require("typescript")` — this
 * package does not depend on it.
 */
function typeInformation(context: TSESLint.RuleContext<string, RuleOptions>): {
  services: ReturnType<typeof getParserServices>;
  checker: ts.TypeChecker;
  tsm: typeof ts;
} | null {
  if (!hasParserServices(context)) return null;
  const services = getParserServices(context);
  const tsm = loadTypeScript();
  // `hasParserServices` already proved a program exists.
  const program = services.program as ts.Program;
  // Null only where TypeScript is not installed, which parser services rule out.
  return tsm && { services, checker: program.getTypeChecker(), tsm };
}

export const noMissingValidationPipe = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-validation-pipe',
  meta: {
    interop: { runtimes: ['eslint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/no-missing-validation-pipe.md',
      description: 'Requires ValidationPipe for DTO input parameters',
      cwe: 'CWE-20',
      cvss: 8.6,
    },
    messages: {
      // `missingValidation` is declared first because it is the rule's primary
      // finding, and security-cvss-docs-consistency reads the FIRST message
      // carrying a CVSS token as the one meta.docs.cvss must match. The
      // secondary undecoratedDto finding scores lower (7.5) on purpose; when it
      // sat first, the lock compared the wrong message against docs.cvss=8.6.
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
      undecoratedDto: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'DTO Carries No Validation Rules',
        cwe: 'CWE-20',
        owasp: 'A03:2021',
        cvss: 7.5,
        description:
          '{{param}} is typed as {{dto}}, and {{dto}} declares no class-validator decorators — a ValidationPipe has nothing to enforce, so every property of the request body passes through unchecked',
        severity: 'HIGH',
        // Both halves, because this branch reports before the global-pipe
        // check and so fires whether or not a pipe exists. Decorators with no
        // pipe to run them validate exactly as much as a pipe with no
        // decorators — nothing.
        fix: 'Decorate the DTO properties (@IsString() name: string;) AND apply a ValidationPipe — app.useGlobalPipes(new ValidationPipe()) or @UsePipes(new ValidationPipe()). Neither half validates anything on its own.',
        documentationLink: 'https://docs.nestjs.com/techniques/validation',
      }),
      schemaWithoutPipe: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Schema Declared But Never Enforced',
        cwe: 'CWE-20',
        owasp: 'A03:2021',
        cvss: 8.6,
        description:
          '{{param}} declares a schema, but no StandardSchemaValidationPipe runs on this route — the decorator only attaches the schema as metadata, so the input reaches the handler unvalidated',
        severity: 'HIGH',
        fix: 'Register the pipe that reads the schema: app.useGlobalPipes(new StandardSchemaValidationPipe()), or @UsePipes(StandardSchemaValidationPipe) on the controller or handler',
        documentationLink: 'https://docs.nestjs.com/techniques/validation',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          detectGlobalPipes: {
            type: 'boolean',
            default: true,
            description:
              'Look for a globally registered ValidationPipe before reporting',
          },
          assumeGlobalPipes: {
            type: 'boolean',
            default: false,
            description:
              'Assume a global ValidationPipe exists even if none is found',
          },
          requireExplicitPipe: {
            type: 'boolean',
            default: false,
            description:
              'Require a per-handler pipe even when a global one is registered',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: true,
      assumeGlobalPipes: false,
      detectGlobalPipes: true,
      requireExplicitPipe: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    // Registering no visitors is both the gate and the cheap path: a file
    // that does not use this SDK does no work at all.
    if (!fileUsesNestjs(context.sourceCode.ast)) return {};

    // Merged with `defaultOptions` before `create` runs.
    const {
      allowInTests,
      assumeGlobalPipes,
      detectGlobalPipes,
      requireExplicitPipe,
    } = options as Required<Options>;

    if (allowInTests && isTestFilePath(context.filename)) {
      return {};
    }

    const types = typeInformation(context);

    // The registration lives in another file, so this is the only way a
    // single-file rule can know it exists. Without it the rule reports every
    // route of a correctly-configured application.
    //
    // It suppresses per parameter, not per file. Returning early here also hid
    // `any`, `unknown`, `object`, type literals and unannotated inputs — the
    // shapes carrying no runtime metatype, which a global pipe passes straight
    // through exactly as a local one would. A global registration is evidence
    // about typed DTOs and about nothing else — and that holds equally for one
    // the user tells us about with `assumeGlobalPipes`, which used to switch
    // the whole rule off.
    //
    // A registration in this very file counts too: it is visible without the
    // scan, which reads files from disk and so misses an unsaved buffer.
    const hasGlobalPipe =
      assumeGlobalPipes ||
      (detectGlobalPipes &&
        (GLOBAL_PIPE_REGISTRATION.test(context.sourceCode.text) ||
          getProjectContext(context).hasGlobalValidationPipe));

    /**
     * Whether @UsePipes(...) on this node installs the named `@nestjs/common`
     * pipe. Accepts `Pipe`, `new Pipe(...)` and `common.Pipe`.
     */
    function usesPipe(
      decorators: TSESTree.Decorator[] | undefined,
      pipe: string,
    ): boolean {
      const dec = findDecorator(decorators, 'UsePipes');
      const call = dec ? decoratorCall(dec) : null;
      if (!call) return false;
      return call.arguments.some((arg) => {
        const target =
          arg.type === AST_NODE_TYPES.NewExpression ? arg.callee : arg;
        const scope = context.sourceCode.getScope(arg);
        // A pipe hung off an object this file cannot trace (`ns.ValidationPipe`
        // with no `ns` import) gets the benefit of the doubt: this check only
        // ever silences, and a guess here costs a false positive.
        return resolveModuleBinding(target, scope) === undefined
          ? expressionName(target) === pipe
          : isModuleExport(target, scope, '@nestjs/common', pipe);
      });
    }

    /** Built-ins that coerce a scalar and cannot validate a DTO's shape. */
    const TRANSFORM_ONLY_PIPE = /^(Parse\w*Pipe|DefaultValuePipe)$/;

    /**
     * The pipe NestJS 12 ships to enforce a `schema` option. Nothing else reads
     * the option: `ValidationPipe` validates a class and ignores it.
     */
    const SCHEMA_PIPE = 'StandardSchemaValidationPipe';

    /**
     * What a parameter decorator's arguments say: the pipes it carries, and
     * whether it declares a Standard Schema (NestJS 12).
     *
     * `@Body()` / `@Body('key')` carry nothing; `@Body(SomePipe)`,
     * `@Body(new ValidationPipe())` and `@Body('key', SomePipe)` carry a pipe.
     * A static string is the property key; every other argument is a pipe, with
     * one exception: an options object, `{ schema, pipes }`. That object
     * is not a pipe. Its `pipes` are, and its `schema` is metadata that only
     * `StandardSchemaValidationPipe` enforces.
     */
    function readInputDecorator(decorator: TSESTree.Decorator): {
      pipes: TSESTree.Node[];
      hasSchema: boolean;
      keyed: boolean;
    } {
      const pipes: TSESTree.Node[] = [];
      let hasSchema = false;
      let keyed = false;
      decoratorCall(decorator)?.arguments.forEach((arg) => {
        // `'key'` and `` `key` `` are the same property key — and a string is
        // never a pipe, wherever it sits.
        if (staticString(arg) !== null) {
          keyed = true;
          return;
        }
        if (arg.type !== AST_NODE_TYPES.ObjectExpression) {
          pipes.push(arg);
          return;
        }
        const entries = new Map(
          arg.properties.map((p): [string | null, TSESTree.Node] =>
            p.type === AST_NODE_TYPES.Property
              ? [objectKeyName(p), p.value]
              : [null, p],
          ),
        );
        // An object with a `transform` member is itself a pipe (NestJS reads it
        // that way too), and a spread or computed key may carry anything —
        // both get the benefit of the doubt a pipe gets.
        if (entries.has(null) || entries.has('transform')) {
          pipes.push(arg);
          return;
        }
        hasSchema ||= entries.has('schema');
        const listed = entries.get('pipes');
        if (listed) {
          pipes.push(
            ...(listed.type === AST_NODE_TYPES.ArrayExpression
              ? listed.elements.flatMap((element) => element ?? [])
              : [listed]),
          );
        }
      });
      return { pipes, hasSchema, keyed };
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
    function isUnvalidatable(param: InputParam): boolean {
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
    function isScalarTyped(param: InputParam): boolean {
      const annotation = param.typeAnnotation?.typeAnnotation;
      if (!annotation) return false;
      if (annotation.type === AST_NODE_TYPES.TSUnionType) {
        return annotation.types.every((t) => SCALAR_TYPES.has(t.type));
      }
      return SCALAR_TYPES.has(annotation.type);
    }

    /**
     * Whether the DTO a parameter is typed as declares any class-validator
     * rule.
     *
     * This is the question that could not be answered without type
     * information, and the reason `require-class-validator` was deleted: the
     * evidence lives in whichever file declares the DTO. With a checker the
     * declaration is reachable, and the decorator's *origin* is reachable too —
     * so a validator is identified by the module it came from rather than by a
     * list of names, which is what the name-list version kept getting wrong.
     *
     * Returns null when the answer is not knowable: no type information, an
     * unresolvable type, a declaration outside the project, or a class that
     * extends something. Null means abstain.
     */
    function dtoDeclaresValidators(
      param: InputParam,
    ): { dto: string; validated: boolean } | null {
      if (types === null) return null;
      const { services, checker, tsm } = types;
      const annotation = param.typeAnnotation?.typeAnnotation;
      if (annotation?.type !== AST_NODE_TYPES.TSTypeReference) return null;

      const tsNode = services.esTreeNodeToTSNodeMap.get(annotation);
      const type = checker.getTypeAtLocation(tsNode);
      // A `TSTypeReference` always resolves to a symbol; an `?? aliasSymbol`
      // fallback here was unreachable, and no fixture could be built that took
      // it. The undefined guard stays — unions and unresolvable names hit it.
      const symbol = type.getSymbol();
      if (symbol === undefined) return null;
      // `valueDeclaration`, not `declarations[0]`: it is the declaration that
      // exists at runtime, which is exactly what a pipe needs a metatype from.
      // It is also reachable both ways — a class has one, an interface or type
      // alias does not — where `declarations?.[0]` had an arm no fixture could
      // take, because a resolved symbol always has declarations.
      const declaration = symbol.valueDeclaration;
      if (declaration === undefined) return null;
      if (!tsm.isClassDeclaration(declaration)) return null;

      // A base class may carry the decorators, and this reads one level only —
      // so abstain on `extends`. Not on `implements`: an interface has no
      // decorators to inherit, and `class Dto implements Serializable {}` is a
      // common shape that was silently escaping the check.
      const extendsBase = declaration.heritageClauses?.some(
        (clause) => clause.token === tsm.SyntaxKind.ExtendsKeyword,
      );
      if (extendsBase === true) return null;
      // A DTO from a dependency is not ours to judge.
      if (declaration.getSourceFile().fileName.includes('node_modules')) {
        return null;
      }

      const dto = symbol.getName();
      const validated = declaration.members.some((member) =>
        decoratorsOf(member, tsm).some((d) =>
          isValidatorDecorator(d, tsm, checker),
        ),
      );
      return { dto, validated };
    }

    /**
     * Decorators on a class member.
     *
     * Through `ts.getDecorators`, not by filtering modifiers on a hardcoded
     * `SyntaxKind`. An inlined constant was wrong by one here — `Decorator` is
     * 171 in TypeScript 5.9, not 170 — and the failure mode was silent: no
     * decorators were ever found, so every DTO looked unvalidated and the two
     * invalid tests passed for the wrong reason.
     */
    function decoratorsOf(
      member: ts.ClassElement,
      tsm: typeof ts,
    ): readonly ts.Decorator[] {
      return tsm.canHaveDecorators(member)
        ? (tsm.getDecorators(member) ?? [])
        : [];
    }

    /**
     * Whether a decorator came from `class-validator`.
     *
     * Resolved through the checker to the file that declares it, so
     * `@IsString()` counts and `@ApiProperty()` — which documents a shape
     * without enforcing it — does not, whatever either is named.
     */
    function isValidatorDecorator(
      decorator: ts.Decorator,
      tsm: typeof ts,
      checker: ts.TypeChecker,
    ): boolean {
      const expression = decorator.expression;
      const callee = tsm.isCallExpression(expression)
        ? expression.expression
        : expression;
      const symbol = checker.getSymbolAtLocation(callee);
      // An imported binding points at the import statement; follow it to the
      // declaration so the *origin* decides, not the local name.
      const resolved =
        symbol !== undefined && symbol.flags & tsm.SymbolFlags.Alias
          ? checker.getAliasedSymbol(symbol)
          : symbol;
      // `valueDeclaration`: a decorator is called, so what it resolves to is a
      // value. A name that resolves to nothing has none.
      const declaration = resolved?.valueDeclaration;
      return (
        declaration !== undefined &&
        /[/\\]class-validator[/\\]/.test(declaration.getSourceFile().fileName)
      );
    }

    return {
      MethodDefinition(node: TSESTree.MethodDefinition) {
        const cls = enclosingClass(node);
        if (!cls || !isControllerClass(cls)) return;
        if (!isRouteHandler(node)) return;

        // Skip if class or method has ValidationPipe
        if (
          usesPipe(cls.decorators, 'ValidationPipe') ||
          usesPipe(node.decorators, 'ValidationPipe')
        )
          return;
        const routeSchemaPipe =
          usesPipe(cls.decorators, SCHEMA_PIPE) ||
          usesPipe(node.decorators, SCHEMA_PIPE);

        // TypeScript forbids decorating an overload, so a decorated route
        // handler always has a real body; both value shapes expose `params`.
        for (const declared of node.value.params) {
          // `@Body() dto: CreateDto = {}` binds the same input as the parameter
          // without a default: the decorator sits on the parameter, the name
          // and the type on its left-hand side.
          const param =
            declared.type === AST_NODE_TYPES.AssignmentPattern
              ? declared.left
              : declared;
          // `@Body() { email, password }: LoginDto` binds the same DTO as
          // `@Body() dto: LoginDto`; only its label differs.
          if (
            param.type !== AST_NODE_TYPES.Identifier &&
            param.type !== AST_NODE_TYPES.ObjectPattern
          ) {
            continue;
          }

          const inputDecorator = findDecorator(
            declared.decorators,
            INPUT_DECORATORS,
          );
          if (!inputDecorator) continue;

          // A parameter-scoped pipe validates or transforms the value, and it
          // does not have to be *the* ValidationPipe to do so.
          // `@Param('id', UserByIdPipe)` resolves the id to an entity and
          // throws when it cannot — NestJS's own samples spell it that way,
          // and matching the literal name `ValidationPipe` reported every one
          // of them. Two kinds of pipe do not count: the built-in `Parse*Pipe`
          // family coerces one scalar and cannot check a DTO's shape, and the
          // schema pipe validates only what a `schema` option tells it to.
          const { pipes, hasSchema, keyed } =
            readInputDecorator(inputDecorator);
          const pipeNames = pipes.map(expressionName);
          if (
            pipeNames.some(
              (name) => name !== SCHEMA_PIPE && !TRANSFORM_ONLY_PIPE.test(name),
            )
          ) {
            continue;
          }

          // NestJS 12: `@Body({ schema })` only attaches the schema. It is
          // enforced when StandardSchemaValidationPipe runs — on the parameter,
          // the route, the controller, or globally — and by nothing otherwise.
          // Checked before the scalar exemption: `@Param('id', { schema }) id:
          // number` is a constraint someone wrote and nothing applies.
          if (hasSchema) {
            if (
              pipeNames.includes(SCHEMA_PIPE) ||
              routeSchemaPipe ||
              (hasGlobalPipe && !requireExplicitPipe)
            ) {
              continue;
            }
            context.report({
              node: param,
              messageId: 'schemaWithoutPipe',
              data: {
                param: `@${decoratorName(inputDecorator)}() ${paramLabel(param)}`,
              },
            });
            continue;
          }

          // One named value, not an object of them. `@Param('id')` is a URL
          // path segment: always a string, whatever it is annotated as. An
          // unannotated `@Query('page') page = 1` is validated exactly as much
          // as `page: string`, which is exempt just below — leaving the type
          // off adds no exposure, and a ValidationPipe does nothing for a
          // primitive either way. On 79 NestJS repositories these two shapes
          // were 105 of this rule's 489 reports, every one of them advice to
          // add a pipe that would change nothing. A keyed `@Body('x')` is not
          // exempt: a body field is whatever JSON the client sent.
          const input = decoratorName(inputDecorator);
          if (
            keyed &&
            (input === 'Param' || (input === 'Query' && !param.typeAnnotation))
          ) {
            continue;
          }

          // Scalars are coerced by the framework.
          if (isScalarTyped(param)) continue;

          // With types available, a DTO that declares no rules is a pipe with
          // nothing to enforce — the same exposure as having no pipe at all,
          // and invisible without the checker.
          const dto = dtoDeclaresValidators(param);
          if (dto !== null && !dto.validated) {
            context.report({
              node: param,
              messageId: 'undecoratedDto',
              data: {
                param: `@${decoratorName(inputDecorator)}() ${paramLabel(param)}`,
                dto: dto.dto,
              },
            });
            continue;
          }

          // A global pipe validates a typed DTO wherever it is declared — but
          // it has no metatype to validate an unvalidatable shape against.
          // With no pipe anywhere, a typed DTO is as unvalidated as any other
          // input. `requireExplicitPipe` demands a per-route pipe regardless.
          if (hasGlobalPipe && !requireExplicitPipe && !isUnvalidatable(param))
            continue;

          context.report({
            node: param,
            messageId: 'missingValidation',
            data: {
              param: `@${decoratorName(inputDecorator)}() ${paramLabel(param)}`,
            },
          });
        }
      },
    };
  },
});

/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Bounded same-file value following and SDK-binding resolution
 * for the three inference-SDK factories (`createSdkApiKeyRule`,
 * `createBrowserEscapeHatchRule`, `createSystemPromptInjectionRule`).
 *
 * The factories used to read only what was written inline at the call. The
 * 2026-10-12 FP/FN audit measured what that costs on real code:
 *
 *   - **Inline only.** `const opts = { apiKey: 'sk-…' }; new OpenAI(opts)`, a
 *     key in a const, and a system prompt built one line above the call were
 *     all invisible (false negatives).
 *   - **Any call.** The key rule inspected every `new X({ apiKey })` in a file
 *     that imported the SDK, so `new Pinecone({ apiKey })`,
 *     `expect.objectContaining({ apiKey })` and `createAnthropic({ apiKey })`
 *     (the Vercel AI provider, owned by vercel-ai-security) were all reported as
 *     a hardcoded Anthropic / OpenAI credential (false positives, and a line
 *     reported by two plugins).
 *   - **Local names.** The positional-key check compared the *local* identifier
 *     to `GoogleGenerativeAI`, so `import { GoogleGenerativeAI as G }` went
 *     silent — a verdict decided by a variable's name.
 *
 * Everything here answers from structure: the scope manager says what an
 * identifier is bound to, and an import or `require()` says which module a
 * binding came from. No verdict reads an identifier's spelling. Following is
 * bounded ({@link MAX_FOLLOW_HOPS}) and abstains — returns the node it was
 * given, or `undefined` — whenever a binding is reassigned, imported from a
 * file it cannot see, or a parameter.
 */

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '../ast-node-types';
import { unwrapTypeSyntax } from '../ast/type-syntax';
import { objectKeyName, propertyName } from '../ast/spellings';

type SourceCode = Readonly<TSESLint.SourceCode>;
type Variable = TSESLint.Scope.Variable;

/** How many bindings a single question may follow before it gives up. */
export const MAX_FOLLOW_HOPS = 8;

/** The variable an identifier refers to, through the scope manager. */
export function variableOf(
  id: TSESTree.Identifier,
  sourceCode: SourceCode,
): Variable | undefined {
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(id);
    scope;
    scope = scope.upper
  ) {
    const reference = scope.references.find((r) => r.identifier === id);
    if (reference) return reference.resolved ?? undefined;
    const declared = scope.set.get(id.name);
    if (declared) return declared;
  }
  return undefined;
}

/**
 * Does this identifier name a global — undeclared, or declared only by the
 * environment (`globals: node` puts `process` and `require` in scope with no
 * definition in the file)? A local binding of the same name is not the global.
 */
export function isGlobalReference(
  id: TSESTree.Identifier,
  sourceCode: SourceCode,
): boolean {
  const variable = variableOf(id, sourceCode);
  return variable === undefined || variable.defs.length === 0;
}

/** The single declaration of a variable that is never written after it. */
function singleDefinition(
  variable: Variable | undefined,
): TSESLint.Scope.Definition | undefined {
  if (!variable || variable.defs.length !== 1) return undefined;
  const writes = variable.references.filter((r) => r.isWrite()).length;
  // A `const` / once-written `let` has exactly its initialiser as a write;
  // an import, a parameter or a function name has none.
  return writes <= 1 ? variable.defs[0] : undefined;
}

/**
 * In `{ a: x, b }`, the key whose value binds the local name `name`. The name is
 * only used to *find* the binding the scope manager already resolved — never to
 * decide anything about it.
 */
function patternKeyFor(
  pattern: TSESTree.ObjectPattern,
  name: string,
): string | undefined {
  for (const property of pattern.properties) {
    if (property.type !== AST_NODE_TYPES.Property) continue;
    const value = unwrapPatternDefault(property.value);
    if (value.type !== AST_NODE_TYPES.Identifier || value.name !== name)
      continue;
    return objectKeyName(property) ?? undefined;
  }
  return undefined;
}

/** `{ k = fallback }` binds `k`; the default does not change which key it reads. */
function unwrapPatternDefault(node: TSESTree.Node): TSESTree.Node {
  return node.type === AST_NODE_TYPES.AssignmentPattern ? node.left : node;
}

/**
 * Follow `const x = <expr>` to `<expr>`, as many links as {@link MAX_FOLLOW_HOPS}.
 *
 * Also follows a property destructured out of an object literal
 * (`const { k } = { k: v }`). Returns the node it was given — type wrappers
 * stripped — when the binding cannot be followed: a parameter, an import, a
 * reassigned `let`, a global.
 */
export function followConst(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  hops: number = MAX_FOLLOW_HOPS,
): TSESTree.Node {
  const current = unwrapTypeSyntax(node);
  if (hops <= 0 || current.type !== AST_NODE_TYPES.Identifier) return current;
  const definition = singleDefinition(variableOf(current, sourceCode));
  if (definition?.type !== 'Variable') return current;
  const declarator = definition.node as TSESTree.VariableDeclarator;
  if (declarator.init === null) return current;

  if (declarator.id.type === AST_NODE_TYPES.Identifier) {
    return followConst(declarator.init, sourceCode, hops - 1);
  }
  if (declarator.id.type !== AST_NODE_TYPES.ObjectPattern) return current;

  const key = patternKeyFor(declarator.id, current.name);
  const source = resolveObjectLiteral(declarator.init, sourceCode, hops - 1);
  if (key === undefined || source === undefined) return current;
  const read = readObjectProperty(source, key, sourceCode, hops - 1);
  return read.kind === 'value'
    ? followConst(read.node, sourceCode, hops - 1)
    : current;
}

/** The object literal an expression holds, after following consts. */
export function resolveObjectLiteral(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  hops: number = MAX_FOLLOW_HOPS,
): TSESTree.ObjectExpression | undefined {
  const resolved = followConst(node, sourceCode, hops);
  return resolved.type === AST_NODE_TYPES.ObjectExpression
    ? resolved
    : undefined;
}

/** The array literal an expression holds, after following consts. */
export function resolveArrayLiteral(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  hops: number = MAX_FOLLOW_HOPS,
): TSESTree.ArrayExpression | undefined {
  const resolved = followConst(node, sourceCode, hops);
  return resolved.type === AST_NODE_TYPES.ArrayExpression
    ? resolved
    : undefined;
}

export type PropertyRead =
  | { kind: 'value'; node: TSESTree.Node }
  | { kind: 'absent' }
  | { kind: 'unknown' };

/**
 * What an object literal holds under `key`, the way JavaScript evaluates it:
 * the LAST write wins.
 *
 * Read from the end, so `{ ...base, k: v }` is `v` whatever `base` holds, and
 * `{ k: v, ...base }` is whatever `base` says — followed when `base` is a
 * same-file object literal, `unknown` when it is not. A computed key that is
 * not a static string could be `key`, so it is `unknown` too. `unknown` is the
 * caller's cue to abstain rather than guess.
 */
export function readObjectProperty(
  object: TSESTree.ObjectExpression,
  key: string,
  sourceCode: SourceCode,
  hops: number = MAX_FOLLOW_HOPS,
): PropertyRead {
  for (let i = object.properties.length - 1; i >= 0; i--) {
    const property = object.properties[i]!;
    if (property.type === AST_NODE_TYPES.SpreadElement) {
      const inner =
        hops > 0
          ? resolveObjectLiteral(property.argument, sourceCode, hops - 1)
          : undefined;
      if (inner === undefined) return { kind: 'unknown' };
      const read = readObjectProperty(inner, key, sourceCode, hops - 1);
      if (read.kind !== 'absent') return read;
      continue;
    }
    const name = objectKeyName(property);
    if (name === null) return { kind: 'unknown' };
    if (name === key) return { kind: 'value', node: property.value };
  }
  return { kind: 'absent' };
}

/* ------------------------------------------------------------------------ */
/* Credential shape                                                          */
/* ------------------------------------------------------------------------ */

/**
 * Whole tokens that only appear in a value someone expects to replace. Matched
 * against the literal's own tokens, never a substring and never a variable name.
 */
const PLACEHOLDER_TOKENS = new Set([
  'test',
  'testing',
  'fake',
  'dummy',
  'mock',
  'mocked',
  'example',
  'sample',
  'placeholder',
  'your',
  'yours',
  'changeme',
  'replace',
  'replaceme',
  'redacted',
  'todo',
  'tbd',
  'xxx',
  'xxxx',
  'foo',
  'bar',
  'baz',
  'demo',
  'synthetic',
  'invalid',
  'notreal',
]);

/** A real key is at least this long: AWS key ids are 20, every vendor's secret longer. */
const MIN_CREDENTIAL_LENGTH = 20;

/**
 * Could this string literal be a working credential?
 *
 * Every vendor credential these rules cover is a generated token: at least 20
 * characters, no whitespace, letters and digits mixed. The SDKs' own tests,
 * READMEs and local-model setups pass stand-ins instead — `'my-anthropic-api-key'`,
 * `'test-key'`, `'...'`, `'ollama'`, `'<YOUR_API_KEY>'` — and the 2026-10-12 scan
 * found 946 of those reported as committed credentials across the two vendor SDK
 * repositories, against zero real keys. The value's own shape tells them apart:
 *
 *   - shorter than 20 characters, or containing whitespace;
 *   - no digit (a word-built name like `my-anthropic-api-key`), or no letter;
 *   - a template slot (`<…>`, `{{…}}`, `${…}`, `[…]`) or an elided `...`;
 *   - a run of eight identical characters (`sk-xxxxxxxx…`, a masked value);
 *   - a placeholder word standing as its own token (`fake`, `example`, `your`).
 */
export function isCredentialShaped(value: string): boolean {
  if (value.length < MIN_CREDENTIAL_LENGTH || /\s/.test(value)) return false;
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) return false;
  if (/^(?:<.*>|\{\{.*\}\}|\$\{.*\}|\[.*\])$/.test(value)) return false;
  if (value.includes('...') || value.includes('…')) return false;
  if (/(.)\1{7}/.test(value)) return false;
  const tokens = value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/);
  return !tokens.some((token) => PLACEHOLDER_TOKENS.has(token));
}

/**
 * The string a credential expression holds, when this file fixes it: a string
 * literal or an interpolation-free template, directly or through consts.
 */
export function literalString(
  node: TSESTree.Node,
  sourceCode: SourceCode,
): string | undefined {
  const resolved = followConst(node, sourceCode);
  if (resolved.type === AST_NODE_TYPES.Literal) {
    return typeof resolved.value === 'string' ? resolved.value : undefined;
  }
  if (
    resolved.type === AST_NODE_TYPES.TemplateLiteral &&
    resolved.expressions.length === 0
  ) {
    // `cooked` is only null for a *tagged* template with a bad escape; an
    // untagged one with a bad escape does not parse.
    return String(resolved.quasis[0]!.value.cooked);
  }
  return undefined;
}

/**
 * Every string a credential expression can evaluate to that this file commits:
 * the literal itself, through consts, and both sides of a fallback
 * (`process.env.KEY ?? 'sk-…'`, `a || 'sk-…'`, `c ? env : 'sk-…'`). A key
 * written as the fallback is in source exactly as much as a bare one.
 */
export function committedStrings(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  hops: number = MAX_FOLLOW_HOPS,
): string[] {
  if (hops <= 0) return [];
  const resolved = followConst(node, sourceCode);
  if (resolved.type === AST_NODE_TYPES.LogicalExpression) {
    return [
      ...committedStrings(resolved.left, sourceCode, hops - 1),
      ...committedStrings(resolved.right, sourceCode, hops - 1),
    ];
  }
  if (resolved.type === AST_NODE_TYPES.ConditionalExpression) {
    return [
      ...committedStrings(resolved.consequent, sourceCode, hops - 1),
      ...committedStrings(resolved.alternate, sourceCode, hops - 1),
    ];
  }
  const value = literalString(resolved, sourceCode);
  return value === undefined ? [] : [value];
}

/* ------------------------------------------------------------------------ */
/* SDK bindings                                                              */
/* ------------------------------------------------------------------------ */

/**
 * Where a binding came from: the module specifier and the export path walked
 * from the module object (`['default']` for a default import, `[]` for the
 * module object itself, `['AzureOpenAI']` for a named one).
 */
export interface SdkExport {
  module: string;
  path: readonly string[];
}

/** `require('x')`, when `require` is the real one rather than a local binding. */
function requiredSpecifier(
  node: TSESTree.CallExpression,
  sourceCode: SourceCode,
): string | undefined {
  if (node.callee.type !== AST_NODE_TYPES.Identifier) return undefined;
  if (node.callee.name !== 'require') return undefined;
  if (!isGlobalReference(node.callee, sourceCode)) return undefined;
  const [argument] = node.arguments;
  return argument?.type === AST_NODE_TYPES.Literal &&
    typeof argument.value === 'string'
    ? argument.value
    : undefined;
}

/**
 * Resolve an expression to the SDK export it denotes, or `undefined` when it
 * does not come from a module `owns` accepts.
 *
 * Covers every spelling the module probe accepts: ESM default / named /
 * namespace imports, `require()` with and without destructuring,
 * `import x = require()`, and `await import()` — each through renames, consts
 * and member access (`new sdk.default()`).
 */
export function resolveSdkExport(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  owns: (specifier: string) => boolean,
  hops: number = MAX_FOLLOW_HOPS,
): SdkExport | undefined {
  const current = unwrapTypeSyntax(node);
  if (hops <= 0) return undefined;

  switch (current.type) {
    case AST_NODE_TYPES.AwaitExpression:
      return resolveSdkExport(current.argument, sourceCode, owns, hops - 1);

    case AST_NODE_TYPES.ImportExpression: {
      const source = current.source;
      return source.type === AST_NODE_TYPES.Literal &&
        typeof source.value === 'string' &&
        owns(source.value)
        ? { module: source.value, path: [] }
        : undefined;
    }

    case AST_NODE_TYPES.CallExpression: {
      const specifier = requiredSpecifier(current, sourceCode);
      return specifier !== undefined && owns(specifier)
        ? { module: specifier, path: [] }
        : undefined;
    }

    case AST_NODE_TYPES.MemberExpression: {
      const name = propertyName(current);
      if (name === null) return undefined;
      const base = resolveSdkExport(current.object, sourceCode, owns, hops - 1);
      return base && { module: base.module, path: [...base.path, name] };
    }

    case AST_NODE_TYPES.Identifier:
      return resolveIdentifierExport(current, sourceCode, owns, hops);

    default:
      return undefined;
  }
}

function resolveIdentifierExport(
  id: TSESTree.Identifier,
  sourceCode: SourceCode,
  owns: (specifier: string) => boolean,
  hops: number,
): SdkExport | undefined {
  const definition = singleDefinition(variableOf(id, sourceCode));
  if (definition === undefined) return undefined;

  if (definition.type === 'ImportBinding') {
    const declaration = definition.parent as TSESTree.Node;
    if (declaration.type === AST_NODE_TYPES.TSImportEqualsDeclaration) {
      const reference = declaration.moduleReference;
      return reference.type === AST_NODE_TYPES.TSExternalModuleReference &&
        reference.expression.type === AST_NODE_TYPES.Literal &&
        typeof reference.expression.value === 'string' &&
        owns(reference.expression.value)
        ? { module: reference.expression.value, path: [] }
        : undefined;
    }
    const importDeclaration = declaration as TSESTree.ImportDeclaration;
    const module = importDeclaration.source.value;
    if (!owns(module)) return undefined;
    const specifier = definition.node as
      | TSESTree.ImportSpecifier
      | TSESTree.ImportDefaultSpecifier
      | TSESTree.ImportNamespaceSpecifier;
    if (specifier.type === AST_NODE_TYPES.ImportDefaultSpecifier) {
      return { module, path: ['default'] };
    }
    if (specifier.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
      return { module, path: [] };
    }
    const imported = specifier.imported;
    return {
      module,
      path: [
        imported.type === AST_NODE_TYPES.Identifier
          ? imported.name
          : String(imported.value),
      ],
    };
  }

  if (definition.type !== 'Variable') return undefined;
  const declarator = definition.node as TSESTree.VariableDeclarator;
  if (declarator.init === null) return undefined;
  const base = resolveSdkExport(declarator.init, sourceCode, owns, hops - 1);
  if (base === undefined) return undefined;
  if (declarator.id.type === AST_NODE_TYPES.Identifier) return base;
  if (declarator.id.type !== AST_NODE_TYPES.ObjectPattern) return undefined;
  const key = patternKeyFor(declarator.id, id.name);
  return key === undefined
    ? undefined
    : { module: base.module, path: [...base.path, key] };
}

/**
 * The export name a resolved binding denotes. A default import, a CommonJS
 * module object and `.default` all name the module's main export.
 */
export function sdkExportName(binding: SdkExport): string {
  const last = binding.path[binding.path.length - 1];
  return last === undefined ? 'default' : last;
}

type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;

function isFunctionNode(node: TSESTree.Node): node is FunctionNode {
  return (
    node.type === AST_NODE_TYPES.FunctionDeclaration ||
    node.type === AST_NODE_TYPES.FunctionExpression ||
    node.type === AST_NODE_TYPES.ArrowFunctionExpression
  );
}

function isClassNode(node: TSESTree.Node): node is ClassNode {
  return (
    node.type === AST_NODE_TYPES.ClassDeclaration ||
    node.type === AST_NODE_TYPES.ClassExpression
  );
}

/** The function or class a same-file binding declares, if it declares one. */
function declaredCallable(
  id: TSESTree.Identifier,
  sourceCode: SourceCode,
): FunctionNode | ClassNode | undefined {
  const definition = singleDefinition(variableOf(id, sourceCode));
  if (definition === undefined) return undefined;
  const declared =
    definition.type === 'Variable'
      ? (definition.node as TSESTree.VariableDeclarator).init
      : definition.node;
  if (!declared) return undefined;
  const node = unwrapTypeSyntax(declared as TSESTree.Node);
  return isFunctionNode(node) || isClassNode(node) ? node : undefined;
}

/** Visit every node under `root`, not descending into nested functions. */
function walkOwnBody(
  root: TSESTree.Node,
  visit: (node: TSESTree.Node) => void,
): void {
  const stack: TSESTree.Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    visit(node);
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const value = (node as unknown as Record<string, unknown>)[key];
      const children = Array.isArray(value) ? value : [value];
      for (const child of children) {
        if (
          child !== null &&
          typeof child === 'object' &&
          typeof (child as TSESTree.Node).type === 'string' &&
          !isFunctionNode(child as TSESTree.Node)
        ) {
          stack.push(child as TSESTree.Node);
        }
      }
    }
  }
}

/**
 * The class a `super(...)` call sits in. `super()` outside a class body is a
 * syntax error, so the walk always finds one.
 */
function enclosingClass(node: TSESTree.Node): ClassNode {
  let current = node.parent!;
  while (!isClassNode(current)) current = current.parent!;
  return current;
}

/**
 * Which arguments of a call carry options for an SDK client.
 *
 * Built once per rule; the per-function wrapper analysis is cached by node, so
 * it is paid once per file however many calls ask.
 */
export interface SdkClientMatcher {
  /**
   * The indices of `node`'s arguments that hold SDK client options, or an empty
   * list when the call is not an SDK client construction:
   *
   *   - a callee bound to an SDK export (`new Anthropic()`, `new sdk.default()`,
   *     `bedrock()`, `new OpenAIProvider()`) — every argument;
   *   - `client.withOptions(...)`, the SDKs' clone-with-overrides method;
   *   - a same-file subclass of an SDK class, and `super(...)` inside one;
   *   - a same-file wrapper that passes one of its parameters straight into an
   *     SDK constructor (`function make(o) { return new OpenAI(o) }`) — that
   *     parameter's position only.
   */
  optionArguments(
    node: TSESTree.NewExpression | TSESTree.CallExpression,
    sourceCode: SourceCode,
  ): readonly number[];
  /** The SDK export a callee resolves to, through the same resolution. */
  exportOf(
    callee: TSESTree.Node,
    sourceCode: SourceCode,
  ): SdkExport | undefined;
}

export function createSdkClientMatcher(
  owns: (specifier: string) => boolean,
): SdkClientMatcher {
  const wrapperCache = new WeakMap<FunctionNode, number | null>();

  const isSdkCallee = (callee: TSESTree.Node, sourceCode: SourceCode) =>
    resolveSdkExport(callee, sourceCode, owns) !== undefined;

  /** The parameter a same-file function hands straight to an SDK constructor. */
  function wrapperParameter(
    fn: FunctionNode,
    sourceCode: SourceCode,
  ): number | null {
    const cached = wrapperCache.get(fn);
    if (cached !== undefined) return cached;
    const parameters = sourceCode.getDeclaredVariables(fn);
    const indexOf = (node: TSESTree.Node): number => {
      const arg = unwrapTypeSyntax(node);
      if (arg.type !== AST_NODE_TYPES.Identifier) return -1;
      const variable = variableOf(arg, sourceCode);
      if (variable === undefined || !parameters.includes(variable)) return -1;
      return fn.params.findIndex(
        (param) => unwrapPatternDefault(param) === variable.defs[0]?.name,
      );
    };

    let found: number | null = null;
    walkOwnBody(fn.body, (node) => {
      if (found !== null) return;
      if (
        node.type !== AST_NODE_TYPES.NewExpression &&
        node.type !== AST_NODE_TYPES.CallExpression
      )
        return;
      if (!isSdkCallee(node.callee, sourceCode)) return;
      for (const argument of node.arguments) {
        const direct = indexOf(argument);
        if (direct >= 0) {
          found = direct;
          return;
        }
        if (argument.type !== AST_NODE_TYPES.ObjectExpression) continue;
        for (const property of argument.properties) {
          if (property.type !== AST_NODE_TYPES.SpreadElement) continue;
          const spread = indexOf(property.argument);
          if (spread >= 0) {
            found = spread;
            return;
          }
        }
      }
    });
    wrapperCache.set(fn, found);
    return found;
  }

  function optionArguments(
    node: TSESTree.NewExpression | TSESTree.CallExpression,
    sourceCode: SourceCode,
  ): readonly number[] {
    const all = node.arguments.map((_, i) => i);
    const callee = unwrapTypeSyntax(node.callee);

    if (callee.type === AST_NODE_TYPES.Super) {
      const superClass = enclosingClass(node).superClass;
      return superClass && isSdkCallee(superClass, sourceCode) ? all : [];
    }
    if (
      callee.type === AST_NODE_TYPES.MemberExpression &&
      propertyName(callee) === 'withOptions'
    ) {
      return all;
    }
    if (isSdkCallee(callee, sourceCode)) return all;
    if (callee.type !== AST_NODE_TYPES.Identifier) return [];

    const declared = declaredCallable(callee, sourceCode);
    if (declared === undefined) return [];
    if (isClassNode(declared)) {
      return declared.superClass && isSdkCallee(declared.superClass, sourceCode)
        ? all
        : [];
    }
    const parameter = wrapperParameter(declared, sourceCode);
    return parameter === null ? [] : [parameter];
  }

  return {
    optionArguments,
    exportOf: (callee, sourceCode) =>
      resolveSdkExport(callee, sourceCode, owns),
  };
}

/* ------------------------------------------------------------------------ */
/* Environment reads                                                         */
/* ------------------------------------------------------------------------ */

/**
 * `process.env.X`, `process.env['X']` and `import.meta.env.X` — a value a build
 * or a server process supplies, the opposite of one a visitor supplies.
 */
export function isEnvironmentRead(
  node: TSESTree.Node,
  sourceCode: SourceCode,
): boolean {
  const current = unwrapTypeSyntax(node);
  if (current.type !== AST_NODE_TYPES.MemberExpression) return false;
  const owner = unwrapTypeSyntax(current.object);
  if (owner.type !== AST_NODE_TYPES.MemberExpression) return false;
  if (propertyName(owner) !== 'env') return false;
  const root = unwrapTypeSyntax(owner.object);
  if (root.type === AST_NODE_TYPES.MetaProperty) return true;
  return (
    root.type === AST_NODE_TYPES.Identifier &&
    root.name === 'process' &&
    isGlobalReference(root, sourceCode)
  );
}

/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Structural helpers shared by every rule in this plugin.
 *
 * Each one answers a question from the AST shape alone — which function a call
 * targets, which keys an options object declares, whether a value is read out
 * of the request body — so that renaming every variable to `foo`/`bar` changes
 * none of the answers.
 */

import {
  resolveModuleBinding,
  AST_NODE_TYPES,
  identifierWords,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  derivesFrom,
  lookupVariable,
  returnsOf,
  sameFileFunction,
} from './flow';

/** The four text/object generators that take a prompt and an options object. */
export const AI_SDK_CALLS: readonly string[] = [
  'generateText',
  'streamText',
  'generateObject',
  'streamObject',
];

/**
 * The exact name a call targets: `f()` → `f`, `ai.f()` / `ai['f']()` → `f`.
 *
 * Exact, never a substring. `callee.includes('generateText')` made every rule
 * treat `generateTextureAtlas({...})` as an SDK call.
 */
export function calleeName(callee: TSESTree.Node): string | null {
  if (callee.type === AST_NODE_TYPES.Identifier) return callee.name;
  if (callee.type === AST_NODE_TYPES.MemberExpression)
    return propertyName(callee);
  return null;
}

/** The SDK function `node` calls, if it calls one of `names` by exact name. */
export function sdkCallName(
  node: TSESTree.CallExpression,
  names: readonly string[] = AI_SDK_CALLS,
): string | null {
  const name = calleeName(node.callee);
  return name !== null && names.includes(name) ? name : null;
}

/**
 * Does this options object declare one of `keys`?
 *
 * A spread (`{ ...LIMITS, prompt }`) contributes keys this rule cannot see, so
 * it answers `true`: a `require-*` rule that cannot prove a setting is absent
 * stays silent rather than demanding something the spread may already supply.
 */
export function declaresOption(
  options: TSESTree.ObjectExpression,
  keys: readonly string[],
): boolean {
  return options.properties.some((prop) =>
    prop.type === AST_NODE_TYPES.SpreadElement
      ? true
      : keys.includes(objectKeyName(prop) as string),
  );
}

/** The value of the first property named `key`, or `undefined`. */
export function optionValue(
  options: TSESTree.ObjectExpression,
  key: string,
): TSESTree.Node | undefined {
  for (const prop of options.properties) {
    if (prop.type === AST_NODE_TYPES.Property && objectKeyName(prop) === key) {
      return prop.value;
    }
  }
  return undefined;
}

/** Strip `await`, `x as T`, `x!` and `x satisfies T` — none of them change the value. */
export function unwrap(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  while (
    current.type === AST_NODE_TYPES.AwaitExpression ||
    current.type === AST_NODE_TYPES.TSAsExpression ||
    current.type === AST_NODE_TYPES.TSNonNullExpression ||
    current.type === AST_NODE_TYPES.TSSatisfiesExpression
  ) {
    current =
      current.type === AST_NODE_TYPES.AwaitExpression
        ? current.argument
        : current.expression;
  }
  return current;
}

export { lookupVariable } from './flow';

/** Is `node` an identifier naming a parameter of an enclosing function? */
function isParameter(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  if (node.type !== AST_NODE_TYPES.Identifier) return false;
  return lookupVariable(node.name, scope)?.defs[0]?.type === 'Parameter';
}

/**
 * The request body itself: `await req.json()`, `await req.formData()`,
 * `await req.text()`, or `req.body` — where `req` is a parameter of the
 * enclosing function, i.e. the route handler's request — or a query-string
 * read, `searchParams.get(...)`.
 */
function isRequestBody(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  const target = unwrap(node);
  if (target.type === AST_NODE_TYPES.CallExpression) {
    const callee = target.callee;
    if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
    const method = propertyName(callee) as string;
    // `url.searchParams.get('q')` / `req.nextUrl.searchParams.get('q')` — the
    // query string is the caller's, whatever URL object it hangs off.
    if (
      (method === 'get' || method === 'getAll') &&
      callee.object.type === AST_NODE_TYPES.MemberExpression &&
      propertyName(callee.object) === 'searchParams'
    ) {
      return true;
    }
    return (
      ['json', 'formData', 'text'].includes(method) &&
      isParameter(callee.object, scope)
    );
  }
  return (
    target.type === AST_NODE_TYPES.MemberExpression &&
    propertyName(target) === 'body' &&
    isParameter(target.object, scope)
  );
}

/**
 * Is any part of this value read out of the request?
 *
 * Follows the value through any number of same-file hops (see `./flow`):
 * `const body = await req.json(); const persona = body.persona as string;`
 * reaches `system: persona`, as does a reassignment, a same-file helper's
 * return, or a same-file function's parameter fed from the request.
 */
export function isRequestDerived(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  return derivesFrom(node, {
    sourceCode,
    isSource: (candidate) =>
      isRequestBody(candidate, sourceCode.getScope(candidate)),
  });
}

/** `new Date(...)`, `Date.now()`, or a method called on either (`new Date().toISOString()`). */
function isDateValue(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.NewExpression) {
    return (
      node.callee.type === AST_NODE_TYPES.Identifier &&
      node.callee.name === 'Date'
    );
  }
  if (
    node.type !== AST_NODE_TYPES.CallExpression ||
    node.callee.type !== AST_NODE_TYPES.MemberExpression
  ) {
    return false;
  }
  const receiver = node.callee.object;
  return (
    (receiver.type === AST_NODE_TYPES.Identifier && receiver.name === 'Date') ||
    isDateValue(receiver)
  );
}

/**
 * Text fixed by the source code itself: literals, templates and `+` chains of
 * literals, `const` bindings whose initialiser is one of those, the current
 * date, and a call to a same-file function every return of which is static.
 * Nothing here can carry a caller's input.
 */
export function isStaticText(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  resolving: Set<unknown> = new Set(),
): boolean {
  switch (node.type) {
    case AST_NODE_TYPES.Literal:
      return true;
    case AST_NODE_TYPES.TemplateLiteral:
      return node.expressions.every((expr) =>
        isStaticText(expr, sourceCode, resolving),
      );
    case AST_NODE_TYPES.BinaryExpression:
      return (
        node.operator === '+' &&
        isStaticText(node.left, sourceCode, resolving) &&
        isStaticText(node.right, sourceCode, resolving)
      );
    case AST_NODE_TYPES.Identifier: {
      const variable = lookupVariable(node.name, sourceCode.getScope(node));
      const def = variable?.defs[0];
      // `resolving` holds the bindings on the current path only, so a
      // self-referential initialiser terminates without blocking a constant
      // that is legitimately read twice.
      if (
        def?.type !== 'Variable' ||
        def.parent.kind !== 'const' ||
        def.node.init === null ||
        resolving.has(variable)
      ) {
        return false;
      }
      resolving.add(variable);
      const result = isStaticText(def.node.init, sourceCode, resolving);
      resolving.delete(variable);
      return result;
    }
    case AST_NODE_TYPES.CallExpression: {
      // `system: buildSystemPrompt()` where every return of that same-file
      // function is itself static text.
      const fn = sameFileFunction(node.callee, sourceCode);
      if (!fn || resolving.has(fn)) return isDateValue(node);
      resolving.add(fn);
      const returns = returnsOf(fn, sourceCode);
      const result =
        returns.length > 0 &&
        returns.every((expr) => isStaticText(expr, sourceCode, resolving));
      resolving.delete(fn);
      return result;
    }
    default:
      return isDateValue(node);
  }
}

export { isDateValue };

/**
 * Does `name` END with the whole words of `term`? English camelCase puts the
 * head noun last: `userInput` and `searchQuery` are an input and a query;
 * `inputTokens` and `queryTimeout` are tokens and a timeout.
 */
export function nameEndsWithWords(name: string, term: string): boolean {
  const words = identifierWords(name);
  const tail = identifierWords(term);
  const offset = words.length - tail.length;
  return offset >= 0 && tail.every((word, i) => words[offset + i] === word);
}

/**
 * The names along a call chain, root first:
 * `supabase.from('t').select` → `supabase.from.select`,
 * `(await store.search(q)).filter` → `store.search.filter`.
 * Unnameable links (`o[k]`) contribute an empty segment; a non-identifier
 * root (`this`, `new X()`) contributes nothing.
 */
export function calleeChain(callee: TSESTree.Node): string {
  const parts: string[] = [];
  let current = unwrap(callee);
  while (
    current.type === AST_NODE_TYPES.MemberExpression ||
    current.type === AST_NODE_TYPES.CallExpression
  ) {
    if (current.type === AST_NODE_TYPES.MemberExpression) {
      parts.unshift(propertyName(current) ?? '');
      current = unwrap(current.object);
    } else {
      current = unwrap(current.callee);
    }
  }
  if (current.type === AST_NODE_TYPES.Identifier) parts.unshift(current.name);
  return parts.join('.');
}

/** `ai`, `ai/react`, `@ai-sdk/react`, `@ai-sdk/openai`, … */
function isSdkModule(module: string): boolean {
  return (
    module === 'ai' || module.startsWith('ai/') || module.startsWith('@ai-sdk/')
  );
}

/** The SDK's UI hooks, whose results carry model output into the component. */
const SDK_UI_HOOKS = new Set([
  'useChat',
  'useCompletion',
  'useObject',
  'useAssistant',
]);

/**
 * `useChat()` / `useCompletion()` … imported from the SDK — resolved through
 * the import, so a same-named hook from another package is not one.
 */
export function isSdkHookCall(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (node.type !== AST_NODE_TYPES.CallExpression) return false;
  const binding = resolveModuleBinding(node.callee, sourceCode.getScope(node));
  return (
    binding !== undefined &&
    isSdkModule(binding.module) &&
    SDK_UI_HOOKS.has(binding.path[binding.path.length - 1])
  );
}

/** Does this type annotation name a type imported from the SDK, directly or through a same-file alias? */
function referencesSdkType(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  seen: Set<TSESTree.Node> = new Set(),
): boolean {
  if (seen.has(node)) return false;
  seen.add(node);
  if (node.type === AST_NODE_TYPES.TSTypeReference) {
    let name: TSESTree.Node = node.typeName;
    while (name.type === AST_NODE_TYPES.TSQualifiedName) name = name.left;
    const id = name as TSESTree.Identifier;
    const binding = resolveModuleBinding(id, sourceCode.getScope(node));
    if (binding && isSdkModule(binding.module)) return true;
    const alias = typeDeclaration(id, sourceCode);
    if (alias && referencesSdkType(alias, sourceCode, seen)) return true;
  }
  for (const key of sourceCode.visitorKeys[node.type] as readonly string[]) {
    const child = (node as unknown as Record<string, unknown>)[key];
    for (const item of Array.isArray(child) ? child : [child]) {
      if (
        item &&
        typeof (item as TSESTree.Node).type === 'string' &&
        referencesSdkType(item as TSESTree.Node, sourceCode, seen)
      ) {
        return true;
      }
    }
  }
  return false;
}

/** The body of a same-file `type X = …` or `interface X { … }`. */
function typeDeclaration(
  id: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
): TSESTree.Node | undefined {
  const def = lookupVariable(id.name, sourceCode.getScope(id))?.defs[0];
  if (def?.node.type === AST_NODE_TYPES.TSTypeAliasDeclaration)
    return def.node.typeAnnotation;
  if (def?.node.type === AST_NODE_TYPES.TSInterfaceDeclaration)
    return def.node.body;
  return undefined;
}

/** The annotation of member `key` in a type literal, interface or same-file alias of one. */
function memberAnnotation(
  type: TSESTree.Node | undefined,
  key: string,
  sourceCode: TSESLint.SourceCode,
): TSESTree.Node | undefined {
  let body = type;
  if (
    body?.type === AST_NODE_TYPES.TSTypeReference &&
    body.typeName.type === AST_NODE_TYPES.Identifier
  ) {
    body = typeDeclaration(body.typeName, sourceCode);
  }
  const members =
    body?.type === AST_NODE_TYPES.TSTypeLiteral
      ? body.members
      : body?.type === AST_NODE_TYPES.TSInterfaceBody
        ? body.body
        : [];
  const member = members.find(
    (m) =>
      m.type === AST_NODE_TYPES.TSPropertySignature &&
      // A property signature spells its key the same four ways a property does.
      objectKeyName(m as unknown as TSESTree.Property) === key,
  ) as TSESTree.TSPropertySignature | undefined;
  return member?.typeAnnotation;
}

/**
 * A parameter declared with an SDK message type: `(m: UIMessage)`,
 * `({ m }: { m: UIMessage })`, or `(props: Props)` where a same-file `Props`
 * names one. Decided from the type annotation, never the parameter's name.
 */
export function isSdkTypedParameter(
  variable: TSESLint.Scope.Variable,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const name = variable.defs[0].name as TSESTree.Identifier;
  let annotation: TSESTree.Node | undefined = name.typeAnnotation;
  const holder = name.parent;
  if (
    !annotation &&
    holder.type === AST_NODE_TYPES.Property &&
    holder.parent.type === AST_NODE_TYPES.ObjectPattern
  ) {
    annotation = memberAnnotation(
      holder.parent.typeAnnotation?.typeAnnotation,
      objectKeyName(holder) as string,
      sourceCode,
    );
  }
  return annotation !== undefined && referencesSdkType(annotation, sourceCode);
}

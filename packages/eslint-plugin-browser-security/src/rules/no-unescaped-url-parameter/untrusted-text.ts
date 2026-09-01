/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Is this expression **text somebody outside the program chose**?
 *
 * A different question from `utils/url-taint.ts`'s. That one asks whether an
 * attacker can pick the *origin* a URL points at, which is why it only follows
 * the LEADING operand of a concatenation — nothing appended after the host can
 * retarget it. Encoding is the opposite: `?q=` + attacker text is a defect in
 * every position, because a single `&` or `#` in that text re-partitions the
 * query for the server that parses it.
 *
 * So this file reuses url-taint's proofs for the sources they share and adds the
 * three the URL rules never needed:
 *
 * 1. **A URL container's readers.** `new URLSearchParams(location.search).get('q')`
 *    — now proven in url-taint itself, since all five rules were blind to it.
 * 2. **A DOM read.** `input.value` where the element was obtained from a
 *    document query, and `event.target.value` inside a function that is
 *    installed as an event handler. Both are resolved through scope; neither
 *    looks at how the variable is spelled.
 * 3. **A parameter of an EXPORTED function.** This is the one piece of evidence
 *    that is about reachability rather than about a source: the callers of an
 *    exported function are, by definition, not in this file, so the value is
 *    unknowable here and the encoding contract belongs to whoever interpolates
 *    it. A module-private helper is left alone — its call sites are visible and
 *    a rule that reported them would fire on every string builder in a codebase.
 *
 * WHAT IS DELIBERATELY NOT EVIDENCE
 *
 * The spelling of anything. The rule this replaced decided with
 * `/\binput\b/i`, `/\bparam\b/i` and `/\burl\b/i` over `sourceCode.getText()`,
 * which reported `input.toFixed(2)` and `const PARAM = 'static'` while missing
 * all three of the sources above.
 *
 * An unknown call also stays opaque, exactly as in url-taint — which is what
 * makes `encodeURIComponent(q)` untainted without a special case for it.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, resolveModuleBinding, staticString, propertyName } from '@interlace/eslint-devkit';
import {
  isAttackerSteerableUrl,
  resolveBoundInitializer,
  STEERABILITY_PRESERVING_FUNCTIONS,
  STEERABILITY_PRESERVING_METHODS,
} from '../../utils/url-taint';

/**
 * Reshaping operations url-taint does not need but this question does.
 *
 * `params.getAll('tag').join(',')` is inbound text with commas between it.
 * `join` is only ever consulted on a receiver that has ALREADY been proven
 * untrusted, so `['id', 'name'].join(',')` — an array this module wrote — is
 * unaffected: what is joined is what decides.
 */
const TEXT_PRESERVING_METHODS: ReadonlySet<string> = new Set([
  ...STEERABILITY_PRESERVING_METHODS,
  'join',
  'concat',
  'padStart',
  'padEnd',
  'repeat',
]);

/* -------------------------------------------------------------------------- */
/* DOM reads                                                                  */
/* -------------------------------------------------------------------------- */

/** Properties that hand back text the user typed or the document carries. */
const DOM_TEXT_PROPS: ReadonlySet<string> = new Set([
  'value',
  'textContent',
  'innerText',
]);

/** `document.querySelector(…)` and friends — the ways to obtain an element. */
const DOM_QUERY_METHODS: ReadonlySet<string> = new Set([
  'getElementById',
  'querySelector',
  'querySelectorAll',
  'getElementsByName',
  'getElementsByClassName',
  'getElementsByTagName',
  'closest',
]);

const DOCUMENT_GLOBALS: ReadonlySet<string> = new Set(['document']);

/** Modules whose `useRef` hands back a container for a DOM node. */
const REACT_MODULES: ReadonlySet<string> = new Set(['react', 'preact/hooks']);

/** `.target` / `.currentTarget` — the element an event was delivered to. */
const EVENT_TARGET_PROPS: ReadonlySet<string> = new Set([
  'target',
  'currentTarget',
]);

/** The static property name of a member access, or `null` when computed. */
function staticProperty(node: TSESTree.MemberExpression): string | null {
  if (!node.computed) {
    return node.property.type === AST_NODE_TYPES.Identifier
      ? node.property.name
      : null;
  }
  return node.property.type === AST_NODE_TYPES.Literal &&
    typeof node.property.value === 'string'
    ? node.property.value
    : null;
}

/** Is `name` the environment's global rather than a binding of the author's? */
function isUnshadowedGlobal(
  node: TSESTree.Node,
  names: ReadonlySet<string>,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (node.type !== AST_NODE_TYPES.Identifier || !names.has(node.name)) {
    return false;
  }
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
    scope !== null;
    scope = scope.upper
  ) {
    const variable = scope.variables.find((v) => v.name === node.name);
    if (variable !== undefined) return variable.defs.length === 0;
  }
  return true;
}

/**
 * The function a parameter belongs to, or `null` when this identifier is not a
 * parameter at all.
 */
function parameterDefinition(
  node: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
): { owner: TSESTree.Node; parameter: TSESTree.Identifier } | null {
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
    scope !== null;
    scope = scope.upper
  ) {
    const variable = scope.variables.find((v) => v.name === node.name);
    if (variable === undefined) continue;
    const def = variable.defs[0];
    if (def === undefined || def.type !== 'Parameter') return null;
    // A `Parameter` definition names exactly one binding, and the scope
    // manager records that binding's own identifier here.
    return { owner: def.node, parameter: def.name as TSESTree.Identifier };
  }
  return null;
}

/**
 * Is this function installed as an event handler?
 *
 * Three positions, all structural: the second argument of an
 * `addEventListener` call, the value of a JSX attribute, and the right-hand
 * side of a write to a member (`el.oninput = fn`). No handler NAME is examined
 * — matching an `on`-prefix would be the spelling test this file refuses.
 */
function isHandlerFunction(fn: TSESTree.Node): boolean {
  const parent = fn.parent;
  if (
    parent?.type === AST_NODE_TYPES.CallExpression &&
    parent.callee.type === AST_NODE_TYPES.MemberExpression &&
    // `el['addEventListener'](…)` registers the same listener.
    staticProperty(parent.callee) === 'addEventListener'
  ) {
    return true;
  }
  if (parent?.type === AST_NODE_TYPES.JSXExpressionContainer) {
    return parent.parent.type === AST_NODE_TYPES.JSXAttribute;
  }
  return (
    parent?.type === AST_NODE_TYPES.AssignmentExpression &&
    parent.right === fn &&
    parent.left.type === AST_NODE_TYPES.MemberExpression
  );
}

/** `useRef(...)`, resolved through the import graph rather than by spelling. */
function isReactRef(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  seen: Set<string>,
): boolean {
  if (node.type === AST_NODE_TYPES.CallExpression) {
    const binding = resolveModuleBinding(node.callee, sourceCode.getScope(node));
    return binding !== undefined && REACT_MODULES.has(binding.module);
  }
  if (node.type !== AST_NODE_TYPES.Identifier) return false;
  if (seen.has(node.name)) return false;
  seen.add(node.name);
  const init = resolveBoundInitializer(node, sourceCode);
  return init !== undefined && isReactRef(init, sourceCode, seen);
}

/**
 * Does this expression denote a DOM element?
 *
 * `document.getElementById('q')`, `form.querySelector('input')`, an alias of
 * either, an index into a `querySelectorAll` result, and the `.target` of an
 * event object inside a handler.
 */
function isDomElement(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  seen: Set<string>,
): boolean {
  switch (node.type) {
    case AST_NODE_TYPES.CallExpression: {
      const callee = node.callee;
      if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
      const method = staticProperty(callee);
      if (method === null || !DOM_QUERY_METHODS.has(method)) return false;
      return (
        isUnshadowedGlobal(callee.object, DOCUMENT_GLOBALS, sourceCode) ||
        isDomElement(callee.object, sourceCode, seen)
      );
    }

    case AST_NODE_TYPES.MemberExpression: {
      // `querySelectorAll(...)[0]` — one element out of a NodeList.
      if (node.computed && node.property.type !== AST_NODE_TYPES.Literal) {
        return isDomElement(node.object, sourceCode, seen);
      }
      const property = staticProperty(node);
      if (property === null) return isDomElement(node.object, sourceCode, seen);
      // `inputRef.current` — how most React code holds an element. Proven from
      // the `useRef` import, not from the binding ending in `Ref`.
      if (property === 'current') {
        return isReactRef(node.object, sourceCode, seen);
      }
      if (!EVENT_TARGET_PROPS.has(property)) return false;
      // `event.target` — only when `event` is the parameter of a function that
      // is actually installed as a handler.
      if (node.object.type !== AST_NODE_TYPES.Identifier) return false;
      const definition = parameterDefinition(node.object, sourceCode);
      return definition !== null && isHandlerFunction(definition.owner);
    }

    case AST_NODE_TYPES.Identifier: {
      if (seen.has(node.name)) return false;
      seen.add(node.name);
      const init = resolveBoundInitializer(node, sourceCode);
      return init !== undefined && isDomElement(init, sourceCode, seen);
    }

    default:
      return false;
  }
}

/* -------------------------------------------------------------------------- */
/* FormData                                                                   */
/* -------------------------------------------------------------------------- */

const FORM_DATA_CONSTRUCTORS: ReadonlySet<string> = new Set(['FormData']);
const FORM_DATA_READERS: ReadonlySet<string> = new Set(['get', 'getAll']);

/** `new FormData(form)` and any `const` alias of it. */
function isFormData(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  seen: Set<string>,
): boolean {
  if (node.type === AST_NODE_TYPES.NewExpression) {
    return isUnshadowedGlobal(node.callee, FORM_DATA_CONSTRUCTORS, sourceCode);
  }
  if (node.type !== AST_NODE_TYPES.Identifier) return false;
  if (seen.has(node.name)) return false;
  seen.add(node.name);
  const init = resolveBoundInitializer(node, sourceCode);
  return init !== undefined && isFormData(init, sourceCode, seen);
}

/** `new FormData(form).get('q')` — a form field, chosen by whoever filled it. */
function isFormDataRead(
  node: TSESTree.CallExpression,
  sourceCode: TSESLint.SourceCode,
  seen: Set<string>,
): boolean {
  const callee = node.callee;
  return (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    FORM_DATA_READERS.has(propertyName(callee) as string) &&
    isFormData(callee.object, sourceCode, new Set(seen))
  );
}

/* -------------------------------------------------------------------------- */
/* Exported-function parameters                                               */
/* -------------------------------------------------------------------------- */

/** Is this declaration re-exported from the module? */
function isExportedDeclaration(node: TSESTree.Node): boolean {
  const parent = node.parent;
  return (
    parent?.type === AST_NODE_TYPES.ExportNamedDeclaration ||
    parent?.type === AST_NODE_TYPES.ExportDefaultDeclaration
  );
}

/**
 * Is `fn` reachable from outside this module?
 *
 * `export function f(q)`, `export default function (q)`,
 * `export const f = (q) => …`, and the class-method form of each. Anything
 * module-private is NOT accepted: its call sites are in this file, so the value
 * is knowable and reporting it would be a guess.
 */
function isExportedFunction(fn: TSESTree.Node): boolean {
  if (isExportedDeclaration(fn)) return true;
  const parent = fn.parent;
  // `export const build = (q) => …`
  if (
    parent?.type === AST_NODE_TYPES.VariableDeclarator &&
    parent.init === fn
  ) {
    return isExportedDeclaration(parent.parent);
  }
  // `export class C { build(q) {…} }`
  if (
    parent?.type === AST_NODE_TYPES.MethodDefinition ||
    parent?.type === AST_NODE_TYPES.PropertyDefinition
  ) {
    return isExportedDeclaration(parent.parent.parent);
  }
  return false;
}

/**
 * A parameter whose value this module cannot know.
 *
 * Destructured and rest parameters resolve to the same `Parameter` def, so
 * `export function f({ q })` is covered too.
 */
function isUnknowableParameter(
  node: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const definition = parameterDefinition(node, sourceCode);
  if (definition === null || !isExportedFunction(definition.owner)) {
    return false;
  }
  return !hasClosedType(definition.parameter.typeAnnotation?.typeAnnotation);
}

/**
 * Does this annotation pin the value to a set nobody can add a URL
 * metacharacter to?
 *
 * `direction: 'asc' | 'desc'` has a caller outside the module and a value that
 * is nonetheless written down here. `number` and `boolean` are the same
 * argument by a different route: neither has a string representation that can
 * carry a `&` or a `#`. `string` proves nothing and is deliberately absent.
 */
function hasClosedType(annotation: TSESTree.TypeNode | undefined): boolean {
  if (annotation === undefined) return false;
  switch (annotation.type) {
    case AST_NODE_TYPES.TSLiteralType:
      // A template-literal TYPE (`` `id-${string}` ``) has a hole in it.
      return annotation.literal.type === AST_NODE_TYPES.Literal;
    case AST_NODE_TYPES.TSNumberKeyword:
    case AST_NODE_TYPES.TSBooleanKeyword:
    case AST_NODE_TYPES.TSBigIntKeyword:
      return true;
    case AST_NODE_TYPES.TSUnionType:
      return annotation.types.every(hasClosedType);
    default:
      return false;
  }
}

/* -------------------------------------------------------------------------- */
/* The predicate                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Is this `+` addition rather than concatenation?
 *
 * `page + 1` is the successor of a number; `'?q=' + q` is a URL being built.
 * The only difference visible without a type checker is the operands: a numeric
 * literal on one side and no string-valued operand on the other means the
 * result cannot carry a character it did not already have. Reporting
 * `${page + 1}` as an unescaped URL parameter is exactly the noise that gets a
 * security rule switched off.
 */
function isArithmetic(node: TSESTree.BinaryExpression): boolean {
  const isNumericLiteral = (n: TSESTree.Node): boolean =>
    n.type === AST_NODE_TYPES.Literal && typeof n.value === 'number';
  const isTextual = (n: TSESTree.Node): boolean =>
    (staticString(n) !== null) ||
    n.type === AST_NODE_TYPES.TemplateLiteral;
  const left = node.left as TSESTree.Node;
  return (
    (isNumericLiteral(left) || isNumericLiteral(node.right)) &&
    !isTextual(left) &&
    !isTextual(node.right)
  );
}

/**
 * True when this expression evaluates to text the module cannot vouch for.
 *
 * `seen` guards the binding-resolution recursion; callers never pass it.
 */
export function carriesUntrustedText(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  seen: Set<string> = new Set(),
): boolean {
  switch (node.type) {
    case AST_NODE_TYPES.MemberExpression: {
      if (isAttackerSteerableUrl(node, sourceCode)) return true;
      const property = staticProperty(node);
      return (
        property !== null &&
        DOM_TEXT_PROPS.has(property) &&
        isDomElement(node.object, sourceCode, new Set(seen))
      );
    }

    case AST_NODE_TYPES.CallExpression: {
      if (isAttackerSteerableUrl(node, sourceCode)) return true;
      if (isFormDataRead(node, sourceCode, seen)) return true;
      // The same reshaping operations url-taint passes through — none of them
      // can introduce or remove a URL metacharacter.
      const callee = node.callee;
      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        TEXT_PRESERVING_METHODS.has(propertyName(callee) as string)
      ) {
        return carriesUntrustedText(callee.object, sourceCode, seen);
      }
      const [first] = node.arguments;
      if (
        callee.type === AST_NODE_TYPES.Identifier &&
        STEERABILITY_PRESERVING_FUNCTIONS.has(callee.name) &&
        first !== undefined &&
        first.type !== AST_NODE_TYPES.SpreadElement
      ) {
        return carriesUntrustedText(first, sourceCode, seen);
      }
      // Every other call is opaque. This is what makes `encodeURIComponent(q)`,
      // `qs.stringify(o)` and `input.toFixed(2)` clean without naming any of
      // them: a value passed INTO a function is not the value that comes out.
      return false;
    }

    case AST_NODE_TYPES.Identifier: {
      if (seen.has(node.name)) return false;
      seen.add(node.name);
      const init = resolveBoundInitializer(node, sourceCode);
      if (init !== undefined) {
        return carriesUntrustedText(init, sourceCode, seen);
      }
      return isUnknowableParameter(node, sourceCode);
    }

    // Every position of a concatenation counts here — see the header.
    case AST_NODE_TYPES.BinaryExpression:
      // `#field in obj` is the only shape whose left is a PrivateIdentifier,
      // and its operator is `in` — so the `+` test already excludes it.
      return (
        node.operator === '+' &&
        !isArithmetic(node) &&
        (carriesUntrustedText(node.left as TSESTree.Node, sourceCode, seen) ||
          carriesUntrustedText(node.right, sourceCode, seen))
      );

    case AST_NODE_TYPES.TemplateLiteral:
      return node.expressions.some((expression) =>
        carriesUntrustedText(expression, sourceCode, seen),
      );

    case AST_NODE_TYPES.LogicalExpression:
      return (
        carriesUntrustedText(node.left, sourceCode, seen) ||
        carriesUntrustedText(node.right, sourceCode, seen)
      );

    case AST_NODE_TYPES.ConditionalExpression:
      return (
        carriesUntrustedText(node.consequent, sourceCode, seen) ||
        carriesUntrustedText(node.alternate, sourceCode, seen)
      );

    // `q as string`, `q!`, `(q)`, `q?.trim()` — syntax, not a value change.
    case AST_NODE_TYPES.TSAsExpression:
    case AST_NODE_TYPES.TSNonNullExpression:
    case AST_NODE_TYPES.TSSatisfiesExpression:
      return carriesUntrustedText(node.expression, sourceCode, seen);

    case AST_NODE_TYPES.ChainExpression:
      return carriesUntrustedText(node.expression, sourceCode, seen);

    case AST_NODE_TYPES.AwaitExpression:
      return carriesUntrustedText(node.argument, sourceCode, seen);

    default:
      return false;
  }
}

/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview ONE model of "this call turns a value into executing code".
 *
 * `no-eval` (generic sink) and `no-websocket-eval` (WebSocket-sourced payload)
 * are meant to be exact complements: every dynamic-code site is reported by
 * exactly one of them. They were not, because each carried its OWN sink list
 * and the two lists were different sizes:
 *
 *   no-eval yielded on   {any call whose argument resolves to 'websocket'}
 *   no-websocket-eval claimed only {bare `eval`, bare `Function`}
 *
 * The difference is a hole, and everything in it is unreported by BOTH rules
 * while being reported perfectly well one line outside a handler. Measured on
 * the shipped rules:
 *
 * ```js
 * window.eval(payload);                                  // reported
 * ws.onmessage = (e) => { window.eval(e.data); };        // reported by NOBODY
 * execScript(payload);                                   // reported
 * ws.onmessage = (e) => { execScript(e.data); };         // reported by NOBODY
 * globalThis['eval'](payload);                           // reported
 * ws.onmessage = (e) => { globalThis['eval'](e.data); }; // reported by NOBODY
 * ```
 *
 * Detection got *weaker* as the payload got more attacker-controlled — the
 * inverse of what a security rule must do. So the sink list lives here, once,
 * and both rules ask this module. A sink added here is simultaneously claimable
 * by the source rule and yieldable by the generic rule, so the complement
 * cannot drift apart again.
 *
 * EVIDENCE, NOT SPELLING. Every match below is exact membership against a
 * closed set of built-in globals (`NAMES.has(...)`), and every identifier is
 * resolved through the scope chain first: a name with a local definition is a
 * local, not the global, and a local `const run = eval` IS the global reached
 * under another name. No substring test appears anywhere in this file.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';

import { resolveInitializer } from './resolve-binding';

/** The built-in that performs the evaluation. */
export type DynamicCodeName = 'eval' | 'Function' | 'execScript';

/**
 * How the sink was reached.
 *
 * - `direct` — the bare global identifier: `eval(x)`, `Function(x)`,
 *   `new Function(x)`, `execScript(x)`.
 * - `indirect` — the same global under any other spelling: `window.eval(x)`,
 *   `globalThis['eval'](x)`, `(0, eval)(x)`, `const run = eval; run(x)`,
 *   `[].constructor.constructor(x)`.
 * - `timer` — a timer builtin handed a value that is *provably a string*, which
 *   the platform then evaluates. `setTimeout(fn, 0)` is not this.
 */
export type DynamicCodeKind = 'direct' | 'indirect' | 'timer';

export interface DynamicCodeSink {
  kind: DynamicCodeKind;
  /** The built-in reached, for the `direct`/`indirect` kinds. */
  name: DynamicCodeName | null;
  /** Human label, used verbatim in both rules' `{{function}}` / `{{method}}`. */
  label: string;
  /**
   * The arguments that become executing code.
   *
   * All of them for `Function`: `new Function(names, body)` stringifies every
   * argument into the generated source, so an injected *parameter name* is just
   * as much an injection as an injected body.
   */
  codeArguments: readonly TSESTree.Node[];
}

/**
 * The evaluation built-ins. Closed set, exact membership.
 *
 * @protocol-constant These are the language's evaluators, fixed by ECMAScript
 * and the legacy IE host API — not a vocabulary anyone chose. The set IS the
 * rule pair's subject: a consumer able to remove `eval` or `Function` would
 * disable the CWE-95 detector while leaving it apparently enabled, and one able
 * to add a name would report an ordinary call as remote code execution.
 */
const DYNAMIC_CODE_NAMES: ReadonlySet<DynamicCodeName> = new Set<DynamicCodeName>(
  ['eval', 'Function', 'execScript'],
);

/**
 * Names that denote the global object.
 *
 * Deliberately NOT `src/utils/global-object.ts`: that helper is owned by the
 * storage rules, rejects computed access (`globalThis['eval']`) by design, and
 * excludes `global` — which bundlers shim into browser bundles and which this
 * rule has always reported. Duplicating a four-entry closed set is cheaper than
 * widening a shared helper four rule families depend on.
 *
 * @protocol-constant These are the four spellings that denote the global object
 * in a browser, a worker or a bundled module — a platform fact, not a tunable
 * word list. `top` and `parent` are absent because they name a DIFFERENT window.
 * Shortening the set would hide `window.eval(...)` and `self.eval(...)` from the
 * evaluator detector; lengthening it would make an ordinary object's `.eval`
 * method report as the platform evaluator, which is the false positive the
 * receiver check was added to close.
 */
const GLOBAL_RECEIVERS: ReadonlySet<string> = new Set([
  'window',
  'self',
  'globalThis',
  'global',
]);

/**
 * Timer built-ins that evaluate a string body.
 *
 * @protocol-constant These are the host timer functions whose HTML-spec
 * behaviour is to compile a string first argument as code — a platform API, not
 * a vocabulary. Membership alone never reports: the body must additionally be a
 * provably-string expression. A consumer able to edit the set could either
 * silence `setTimeout('...')`, the oldest eval-by-another-name in the language,
 * or make an ordinary scheduling helper report as code execution.
 */
const TIMER_NAMES: ReadonlySet<string> = new Set([
  'setTimeout',
  'setInterval',
  'setImmediate',
]);

/**
 * Does this identifier still mean the global built-in?
 *
 * A name with any local definition is a local binding — `function Function() {}`
 * or `import { eval } from './shim'` is not the platform's evaluator. ESLint
 * models real globals as variables with zero definitions, or as no variable at
 * all, so both of those are "unshadowed".
 */
function isUnshadowedGlobal(
  identifier: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
): boolean {
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(identifier);
    scope !== null;
    scope = scope.upper
  ) {
    const variable = scope.variables.find((v) => v.name === identifier.name);
    if (variable !== undefined) return variable.defs.length === 0;
  }
  return true;
}

/** The built-in an expression names, when it is a bare unshadowed global. */
function bareGlobal(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): DynamicCodeName | null {
  if (node.type !== AST_NODE_TYPES.Identifier) return null;
  if (!DYNAMIC_CODE_NAMES.has(node.name as DynamicCodeName)) return null;
  return isUnshadowedGlobal(node, sourceCode)
    ? (node.name as DynamicCodeName)
    : null;
}

/** `window.eval`, `globalThis['eval']`, `self.Function` — one level only. */
function qualifiedGlobal(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): DynamicCodeName | null {
  if (node.type !== AST_NODE_TYPES.MemberExpression) return null;
  if (
    node.object.type !== AST_NODE_TYPES.Identifier ||
    !GLOBAL_RECEIVERS.has(node.object.name) ||
    !isUnshadowedGlobal(node.object, sourceCode)
  ) {
    return null;
  }
  // A NON-computed property on a global receiver is always an `Identifier`: the
  // only other possibility the grammar allows is a `PrivateIdentifier`, which
  // requires a class-instance receiver and is a syntax error on `window`. There
  // is no test that can reach the other branch, and an unreachable branch is how
  // coverage stops meaning anything — so the narrowing is asserted, not guarded.
  const property = node.computed
    ? literalString(node.property)
    : (node.property as TSESTree.Identifier).name;
  if (property === null) return null;
  return DYNAMIC_CODE_NAMES.has(property as DynamicCodeName)
    ? (property as DynamicCodeName)
    : null;
}

/** The string a computed key literally is — `window['eval']`, never `window[k]`. */
function literalString(node: TSESTree.Node): string | null {
  return node.type === AST_NODE_TYPES.Literal &&
    typeof node.value === 'string'
    ? node.value
    : null;
}

/**
 * `[].constructor.constructor(body)` / `''.constructor.constructor(body)`.
 *
 * Reaching `Function` through two `.constructor` hops is the standard way to
 * write `new Function` without writing its name, and it is what a payload does
 * once a codebase bans the spelling. Structurally unambiguous: nothing else
 * *calls* `x.constructor.constructor`.
 */
function constructorChain(node: TSESTree.Node): DynamicCodeName | null {
  const isConstructorAccess = (n: TSESTree.Node): n is TSESTree.MemberExpression =>
    n.type === AST_NODE_TYPES.MemberExpression &&
    !n.computed &&
    n.property.type === AST_NODE_TYPES.Identifier &&
    n.property.name === 'constructor';
  if (!isConstructorAccess(node)) return null;
  return isConstructorAccess(node.object) ? 'Function' : null;
}

/**
 * `(0, eval)(x)` — the canonical indirect eval, which runs in global scope.
 *
 * A sequence expression evaluates to its LAST element, so that is the callee.
 */
function sequenceCallee(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): DynamicCodeName | null {
  if (node.type !== AST_NODE_TYPES.SequenceExpression) return null;
  // A SequenceExpression always parses with at least two operands — `()` is a
  // syntax error — so there is no empty case to guard.
  const last = node.expressions[node.expressions.length - 1] as TSESTree.Node;
  return bareGlobal(last, sourceCode);
}

/**
 * `const run = eval; run(x)` — the alias, resolved through the binding.
 *
 * `resolveInitializer` refuses any binding that is re-assigned or declared more
 * than once, so this can only ever say yes about a value that provably still is
 * the global.
 */
function aliasedGlobal(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): DynamicCodeName | null {
  if (node.type !== AST_NODE_TYPES.Identifier) return null;
  const init = resolveInitializer(node, sourceCode);
  if (init === undefined) return null;
  return (
    bareGlobal(init, sourceCode) ??
    qualifiedGlobal(init, sourceCode) ??
    constructorChain(init)
  );
}

/**
 * Is this expression *provably* a string?
 *
 * The evidence bar for a timer sink. `setTimeout(handler, 0)` where `handler`
 * is an identifier is the normal, correct spelling of a timer and must stay
 * silent; `setTimeout('tick()')`, `setTimeout(\`tick(${id})\`)` and
 * `setTimeout('run(' + id + ')')` are code, and the third is the shape an
 * injection actually takes.
 */
function isProvableString(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.Literal) return typeof node.value === 'string';
  if (node.type === AST_NODE_TYPES.TemplateLiteral) return true;
  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    return (
      isProvableString(node.left as TSESTree.Node) ||
      isProvableString(node.right)
    );
  }
  return false;
}

/** The timer built-in this callee names, bare or global-qualified. */
function timerName(
  callee: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): string | null {
  if (
    callee.type === AST_NODE_TYPES.Identifier &&
    TIMER_NAMES.has(callee.name) &&
    isUnshadowedGlobal(callee, sourceCode)
  ) {
    return callee.name;
  }
  if (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    !callee.computed &&
    callee.object.type === AST_NODE_TYPES.Identifier &&
    GLOBAL_RECEIVERS.has(callee.object.name) &&
    isUnshadowedGlobal(callee.object, sourceCode) &&
    callee.property.type === AST_NODE_TYPES.Identifier &&
    TIMER_NAMES.has(callee.property.name)
  ) {
    return callee.property.name;
  }
  return null;
}

const LABELS: Readonly<Record<DynamicCodeName, string>> = {
  eval: 'eval',
  Function: 'Function constructor',
  execScript: 'execScript',
};

/**
 * The dynamic-code sink this call is, if it is one.
 *
 * Both `no-eval` and `no-websocket-eval` route every reporting decision through
 * this function, so their sink surfaces are identical by construction and the
 * "reported by nobody" hole documented at the top of this file cannot reopen.
 *
 * @param node - a `CallExpression` or `NewExpression`
 * @param sourceCode - for scope resolution; nothing here matches on spelling alone
 */
export function dynamicCodeSink(
  node: TSESTree.CallExpression | TSESTree.NewExpression,
  sourceCode: TSESLint.SourceCode,
): DynamicCodeSink | undefined {
  const callee = node.callee;
  const args = node.arguments as readonly TSESTree.Node[];

  const direct = bareGlobal(callee, sourceCode);
  if (direct !== null) {
    return {
      kind: 'direct',
      name: direct,
      label: LABELS[direct],
      codeArguments: args,
    };
  }

  const indirect =
    qualifiedGlobal(callee, sourceCode) ??
    constructorChain(callee) ??
    sequenceCallee(callee, sourceCode) ??
    aliasedGlobal(callee, sourceCode);
  if (indirect !== null) {
    return {
      kind: 'indirect',
      name: indirect,
      label: LABELS[indirect],
      codeArguments: args,
    };
  }

  // `new setTimeout(...)` is not a thing; timers are calls only.
  if (node.type === AST_NODE_TYPES.CallExpression) {
    const timer = timerName(callee, sourceCode);
    const body = args[0];
    if (timer !== null && body !== undefined && isProvableString(body)) {
      return {
        kind: 'timer',
        name: null,
        label: `${timer} with string`,
        codeArguments: [body],
      };
    }
  }

  return undefined;
}

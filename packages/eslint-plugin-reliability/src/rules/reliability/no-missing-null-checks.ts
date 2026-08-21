/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-missing-null-checks
 * Detects potential null pointer dereferences
 * CWE-476: NULL Pointer Dereference
 *
 * @see https://cwe.mitre.org/data/definitions/476.html
 * @see https://rules.sonarsource.com/javascript/RSPEC-2259/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds =
  | 'missingNullCheck'
  | 'useOptionalChaining'
  | 'useNullishCoalescing'
  | 'addExplicitCheck';

export interface Options {
  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;

  /** Require explicit null checks. Default: false */
  requireExplicitChecks?: boolean;
}

type RuleOptions = [Options?];

/**
 * Returns true if the identifier resolves to:
 *   - A NEVER_NULL_GLOBALS entry (built-in / known singleton)
 *   - A catch-clause parameter (`catch (e) { e.message }` — never null)
 *   - A variable initialized by `new X(...)` (constructor result is never null)
 *   - A top-level import (`import x from 'y'` — never null)
 *
 * For these, the rule should not demand a null check.
 */

/**
 * The value a declarator actually receives, through any chain of `=`.
 *
 * `var pets = exports.pets = []` is the ordinary CommonJS re-export idiom, and
 * the declarator's `init` for it is the ASSIGNMENT, not the array. None of the
 * non-null initialiser checks below match an AssignmentExpression, so every
 * later use of `pets` fell through to a CWE-476 report — on a value that is
 * demonstrably an array literal two tokens away.
 *
 * Measured over the 20-repository corpus, this rule produced 157,699 findings,
 * 56% of everything `recommended` reports across all 30 plugins. `express`'s
 * own `examples/mvc/db.js` opens with two of these declarations and draws a
 * finding on every subsequent line that touches either name.
 *
 * Only plain `=` is unwrapped. `a = b ||= c` and `a = b ??= c` can yield the
 * left operand, so their result is not the right-hand value and they keep the
 * conservative reading.
 */
function assignedValue(init: TSESTree.Expression | null): TSESTree.Expression | null {
  let current = init;
  while (current?.type === 'AssignmentExpression' && current.operator === '=') {
    current = current.right;
  }
  return current;
}

/**
 * Expressions the PLATFORM documents as returning null or undefined on a
 * perfectly normal path — not on error, not on a thrown exception.
 *
 * Matched on the method name plus the shape of the call, never on the
 * receiver's name: `rows.find(p)` and `db.find(p)` are the same evidence, and
 * `foo.getElementById` is not excluded for not being spelled `document`.
 *
 * `.get` is DELIBERATELY absent. `Map.prototype.get` really does return
 * undefined, but `axios.get`, `router.get`, `cache.get` and `storage.get` are
 * all far more common in real code and return something else entirely. One
 * entry would have re-added most of the noise this gate removes.
 */
const NULLABLE_RETURNS: ReadonlySet<string> = new Set([
  // Array — a miss is undefined
  'find', 'findLast', 'pop', 'shift',
  // String / RegExp — a non-match is null
  'match', 'exec',
  // DOM — a miss is null
  'getElementById', 'querySelector', 'closest', 'getAttribute', 'getNamedItem',
]);

/**
 * Does anything in this file say the value MIGHT be null?
 *
 * This inverts the question the rule used to ask. It used to report every
 * property access whose object could not be PROVEN non-null, which on real
 * source is very nearly every property access: 38,674 findings across the 8
 * pinned repositories, where all five security plugins together produce 36.
 * The rule's own notes had already measured the same thing from the other end
 * — "this rule alone was 56% of everything `recommended` produces across all
 * 30 plugins" — and answered it by growing the deny-list, which cannot
 * converge: the set of things that are never null is unbounded and unknowable
 * without types.
 *
 * So the burden moves. A finding now needs POSITIVE evidence, and returns the
 * evidence it found so the message can name it. No evidence, no finding —
 * `obj.property` on an unresolvable `obj` says nothing at all about `obj`, and
 * saying it anyway is what a type checker is for.
 *
 * Deliberately NOT evidence: a bare parameter, an `await`, or any unrecognised
 * call. Each was tried and each is indistinguishable from ordinary code.
 */
/**
 * A user-declared binding for `name`, as opposed to the ambient global.
 *
 * `undefined` and friends live in ESLint's global scope as variables with NO
 * definitions. Treating those as shadows makes every `= undefined` check
 * silently vacuous.
 */
function isShadowedBinding(scope: TSESLint.Scope.Scope | null, name: string): boolean {
  for (let s = scope; s; s = s.upper) {
    const variable = s.variables.find((v) => v.name === name);
    if (variable) return variable.defs.length > 0;
  }
  return false;
}

function nullabilityEvidence(
  ident: TSESTree.Identifier,
  scope: TSESLint.Scope.Scope,
  seen: Set<string> = new Set(),
): 'declared-without-initializer' | 'assigned-null' | 'nullable-return' | null {
  // `const alias = hit` must not launder the evidence. One level of aliasing
  // defeated this gate completely — found by the adversarial wave, where it was
  // 1 of 11 genuine null-dereferences the first cut walked past.
  if (seen.has(ident.name)) return null;
  seen.add(ident.name);
  let s: TSESLint.Scope.Scope | null = scope;
  while (s) {
    const variable = s.variables.find((v) => v.name === ident.name);
    if (!variable) {
      s = s.upper;
      continue;
    }
    if (variable.defs.length !== 1) return null;
    const [def] = variable.defs;
    if (def.type !== 'Variable' || def.node?.type !== 'VariableDeclarator') return null;

    const declarator = def.node as TSESTree.VariableDeclarator;
    const init = assignedValue(declarator.init);

    // `let x;` — nothing has been put in it yet, so reading through it is the
    // textbook CWE-476 the rule is named for.
    //
    // A loop head is NOT that, even though it parses identically: `for (const
    // x of list)` is a VariableDeclarator with a null `init`, and the value is
    // bound by the loop rather than left empty. Missing this made the loop
    // variable of every `for…of` in the corpus a finding — the single largest
    // source of what survived the first cut of this gate.
    if (init === null) {
      const declParent = (declarator as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      const loopParent = (declParent as TSESTree.Node & { parent?: TSESTree.Node } | undefined)?.parent;
      if (
        loopParent?.type === 'ForOfStatement' ||
        loopParent?.type === 'ForInStatement'
      ) {
        return null;
      }
      // A later assignment is the normal way to fill a deferred binding:
      //
      //   let activeConfig
      //   if (linked) activeConfig = load() else activeConfig = defaults()
      //   activeConfig.file            // not a null deref
      //
      // Proving WHICH branches assign needs definite-assignment analysis, and
      // without it the honest reading of "it is written somewhere" is "this is
      // ordinary deferred initialisation". Only a binding that is never
      // written at all is unambiguously a read of undefined.
      const writes = variable.references.filter((reference) => reference.isWrite());
      if (writes.length > 0) return null;
      return 'declared-without-initializer';
    }

    // `const x = null` / `= undefined`.
    if (init.type === 'Literal' && init.value === null) return 'assigned-null';
    // `undefined` is a GLOBAL in ESLint's scope model, so a plain
    // `scopeHasBinding` lookup always finds it and would disable this arm
    // entirely. Only a binding with DEFS is a real shadow — `const undefined =
    // x` or a parameter — and only that should suppress.
    if (init.type === 'Identifier' && init.name === 'undefined' && !isShadowedBinding(s, 'undefined')) {
      return 'assigned-null';
    }

    // `const alias = hit` — follow the binding rather than stopping here.
    //
    // Resolved from the DECLARATOR's scope `s`, not the read's scope. The
    // alias initializer was written where the declarator is, so a nested
    // function that happens to rebind the same name must not answer for it:
    //
    //   const hit = rows.find(...)
    //   const alias = hit
    //   function g() { const hit = {}; return alias.name }   // still reports
    if (init.type === 'Identifier') {
      return nullabilityEvidence(init, s, seen);
    }

    // `const hit = c ? rows.find(...) : null` — a conditional is nullable when
    // EITHER arm is. Stopping at the ConditionalExpression let the null arm
    // through untouched.
    if (init.type === 'ConditionalExpression') {
      for (const arm of [init.consequent, init.alternate]) {
        if (arm.type === 'Literal' && arm.value === null) return 'assigned-null';
        // A bare `undefined` arm is the same evidence as a `null` one. Falling
        // through to the alias walk lost it, because resolving the global
        // `undefined` finds a variable with no definitions and answers null.
        if (arm.type === 'Identifier' && arm.name === 'undefined' && !isShadowedBinding(s, 'undefined')) {
          return 'assigned-null';
        }
        if (arm.type === 'Identifier') {
          const viaArm = nullabilityEvidence(arm, s, seen);
          if (viaArm) return viaArm;
        }
        if (
          arm.type === 'CallExpression' &&
          arm.callee.type === 'MemberExpression' &&
          !arm.callee.computed &&
          arm.callee.property.type === 'Identifier' &&
          NULLABLE_RETURNS.has(arm.callee.property.name)
        ) {
          return 'nullable-return';
        }
      }
      return null;
    }

    // `const hit = rows.find(...)` — the platform says this is undefined on a
    // miss, and the miss is the path nobody writes a test for.
    if (
      init.type === 'CallExpression' &&
      init.callee.type === 'MemberExpression' &&
      !init.callee.computed &&
      init.callee.property.type === 'Identifier' &&
      NULLABLE_RETURNS.has(init.callee.property.name)
    ) {
      return 'nullable-return';
    }
    return null;
  }
  return null;
}

/**
 * Resolve the base of a member expression and ask whether it carries evidence.
 *
 * `this` and `this.#field` return false without asking: `this` inside a method
 * is the instance, and a private field is defined whenever it is reachable.
 */
function baseHasNullabilityEvidence(
  objectNode: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  let base: TSESTree.Node = objectNode;
  while (base.type === 'MemberExpression') {
    base = (base as TSESTree.MemberExpression).object;
  }
  if (base.type !== 'Identifier') return false;
  return nullabilityEvidence(base as TSESTree.Identifier, scope) !== null;
}

/**
 * Check if property access has null/undefined check
 *
 * Exported for direct Layer-2 unit testing: the `node.optional` and
 * ChainExpression early returns are defensive duplicates of checks both
 * callers perform before invoking this helper, so they are unreachable
 * through the rule's listeners.
 */
export function hasNullCheck(
  node: TSESTree.MemberExpression,
  sourceCode: TSESLint.SourceCode,
): boolean {
  // Check if node itself uses optional chaining
  if (node.optional) {
    return true;
  }

  // Check if parent is optional chaining
  const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
  if (parent && parent.type === 'ChainExpression') {
    return true;
  }

  // Check if used with nullish coalescing
  if (usesNullishCoalescing(node)) {
    return true;
  }

  const objectText = sourceCode.getText(node.object);

  // Short-circuit AND: `obj && obj.prop` — the right side of && runs only
  // when the left side is truthy, so obj is guaranteed non-null here.
  // Walk up one level (CallExpression wraps MemberExpression for `obj && obj.method()`)
  const immediateParent = parent as TSESTree.Node | undefined;
  const nodeOrCall =
    immediateParent?.type === 'CallExpression' &&
    (immediateParent as TSESTree.CallExpression).callee === node
      ? immediateParent
      : (node as TSESTree.Node);
  const andParent = (nodeOrCall as TSESTree.Node & { parent?: TSESTree.Node })
    .parent as TSESTree.LogicalExpression | undefined;
  if (
    andParent?.type === 'LogicalExpression' &&
    andParent.operator === '&&' &&
    andParent.right === nodeOrCall
  ) {
    // Exact identity only. `endsWith` had the relation backwards: in
    // `wrapper.obj && obj.prop` the left text ends with `obj`, but it guards
    // `wrapper.obj` — a DIFFERENT value — so the finding on `obj` was silently
    // dropped. A guard covers the expression it tests and the chains that
    // START with it, never one that merely shares a suffix.
    //
    // The test that was supposed to catch this passed for the wrong reason:
    // under the old deny-list model the single expected error came from
    // `wrapper.obj` (base `wrapper`, unprovable), not from the suffix trap it
    // claimed to exercise.
    const leftText = sourceCode.getText(andParent.left);
    if (leftText === objectText) return true;
  }

  // Ternary consequent: `obj ? obj.prop : fallback` — the test being truthy
  // guarantees obj is non-null before the consequent evaluates.
  let cur: TSESTree.Node = node;
  for (let depth = 0; depth < 8; depth++) {
    const p: TSESTree.Node | undefined = (cur as TSESTree.Node & { parent?: TSESTree.Node }).parent;
    if (!p) break;
    if (
      p.type === 'ConditionalExpression' &&
      (p as TSESTree.ConditionalExpression).consequent === cur
    ) {
      if (sourceCode.getText((p as TSESTree.ConditionalExpression).test) === objectText) {
        return true;
      }
    }
    cur = p;
  }

  // Explicit null/truthy check in enclosing if statement
  if (hasExplicitNullCheck(node, sourceCode)) {
    return true;
  }

  return false;
}

/**
 * Check for explicit null checks in if statements
 */
function hasExplicitNullCheck(
  node: TSESTree.MemberExpression,
  sourceCode: TSESLint.SourceCode,
): boolean {
  // Walk up the AST to find if statements
  let current: TSESTree.Node | null = node;
  let depth = 0;
  const maxDepth = 10;

  while (current && depth < maxDepth) {
    const parent = (current as TSESTree.Node & { parent?: TSESTree.Node })
      .parent;

    if (parent && parent.type === 'IfStatement') {
      // Check if the test condition contains a null check for our object
      const test = parent.test;
      if (isNullCheckForObject(test, node.object, sourceCode)) {
        return true;
      }
    }

    current = parent as TSESTree.Node;
    depth++;
  }

  return false;
}

/**
 * Check if a test expression is a null check for a specific object
 */
function isNullCheckForObject(
  test: TSESTree.Expression,
  object: TSESTree.Expression,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const objectText = sourceCode.getText(object);

  // Truthy check: `if (obj)` or `if (obj.prop)` — direct truthy guard proves
  // non-null. Also covers nested chains: `if (response) { response.data.items }`
  // because checking the root (response) implicitly protects the full chain.
  if (test.type === 'Identifier' || test.type === 'MemberExpression') {
    const testText = sourceCode.getText(test);
    if (testText === objectText || objectText.startsWith(testText + '.')) {
      return true;
    }
  }

  // Handle binary expressions like obj !== null, obj != undefined
  if (test.type === 'BinaryExpression') {
    const { left, right, operator } = test;
    if (
      operator === '!==' ||
      operator === '!=' ||
      operator === '===' ||
      operator === '=='
    ) {
      const leftText = sourceCode.getText(left);
      const rightText = sourceCode.getText(right);

      if (
        (leftText === objectText &&
          (rightText === 'null' || rightText === 'undefined')) ||
        (rightText === objectText &&
          (leftText === 'null' || leftText === 'undefined'))
      ) {
        return true;
      }
    }
  }

  // Handle logical expressions like obj !== null && obj !== undefined
  if (test.type === 'LogicalExpression') {
    return (
      isNullCheckForObject(test.left, object, sourceCode) ||
      isNullCheckForObject(test.right, object, sourceCode)
    );
  }

  // Unary negation: `if (!obj)` is a FALSY guard — only safe when paired
  // with early return, which requires control-flow analysis. Skip for now.

  return false;
}

/**
 * Check if expression uses nullish coalescing
 */
function usesNullishCoalescing(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | null = node;
  let depth = 0;
  const maxDepth = 5;

  while (current && depth < maxDepth) {
    const parent = (current as TSESTree.Node & { parent?: TSESTree.Node })
      .parent;

    if (
      parent &&
      parent.type === 'LogicalExpression' &&
      parent.operator === '??'
    ) {
      return true;
    }

    current = parent as TSESTree.Node;
    depth++;
  }

  return false;
}

export const noMissingNullChecks = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-null-checks',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-reliability/docs/rules/no-missing-null-checks.md',
      description: 'Detects potential null pointer dereferences',
      cwe: 'CWE-476',
      cvss: 7.5,
    },
    hasSuggestions: true,
    messages: {
      missingNullCheck: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing null check',
        cwe: 'CWE-476',
        description: 'Potential null/undefined dereference detected',
        severity: 'HIGH',
        fix: 'Use optional chaining (?.) or add explicit null check',
        documentationLink:
          'https://rules.sonarsource.com/javascript/RSPEC-2259/',
      }),
      useOptionalChaining: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Optional Chaining',
        description: 'Use optional chaining operator',
        severity: 'LOW',
        fix: 'obj?.property?.method()',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining',
      }),
      useNullishCoalescing: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Nullish Coalescing',
        description: 'Use nullish coalescing operator',
        severity: 'LOW',
        fix: 'value ?? defaultValue',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing',
      }),
      addExplicitCheck: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Explicit Check',
        description: 'Add explicit null check',
        severity: 'LOW',
        fix: 'if (obj !== null) { obj.property }',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/null',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreInTests: {
            type: 'boolean',
            default: true,
            description: 'Ignore in test files',
          },
          requireExplicitChecks: {
            type: 'boolean',
            default: false,
            description: 'Require explicit null checks',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreInTests: true,
      requireExplicitChecks: false,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      ignoreInTests = true,
      // requireExplicitChecks = false, // Not used
    }: Options = options || {};

    const filename = context.filename;
    const isTestFile =
      ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode;

    // Track reported MemberExpression nodes to prevent duplicate reports
    // Key format: "start-end" from node.range
    const reportedMemberExpressions = new Set<string>();

    /**
     * Get a unique key for a MemberExpression node to track if it's been reported
     */
    function getMemberExpressionKey(node: TSESTree.MemberExpression): string {
      // Use the node's range for a unique identifier
      // Range is [start, end] character positions in the source
      if (node.range && Array.isArray(node.range) && node.range.length >= 2) {
        return `me-${node.range[0]}-${node.range[1]}`;
      }
      // Fallback: use location if range is not available
      const loc = (node as TSESTree.Node & { loc?: TSESTree.SourceLocation })
        .loc;
      if (loc && loc.start) {
        return `me-${loc.start.line}-${loc.start.column}-${loc.end?.line || loc.start.line}-${loc.end?.column || loc.start.column}`;
      }
      // Last resort: use a hash of the node structure
      return `me-${JSON.stringify(node).slice(0, 50)}`;
    }

    /**
     * Check member expressions for null safety
     */
    function checkMemberExpression(node: TSESTree.MemberExpression) {
      // Skip if already using optional chaining
      if (node.optional) {
        return;
      }

      // Skip if parent is optional chaining
      const parent = (node as TSESTree.Node & { parent?: TSESTree.Node })
        .parent;
      if (parent && parent.type === 'ChainExpression') {
        return;
      }

      // Only report on the "deepest" member expression in a chain
      // If this member expression is the object of another member expression,
      // don't report it yet - let the deepest one be reported
      if (
        parent &&
        parent.type === 'MemberExpression' &&
        parent.object === node
      ) {
        return; // This is an intermediate member expression
      }

      // Check if object might be null/undefined
      // Check for Identifier or nested MemberExpression
      const objectNode = node.object;
      let shouldCheck = false;

      // Evidence-based: see nullabilityEvidence. A chain is judged by its BASE
      // — `a.b.c` carries no information about `a.b`, so asking about the
      // intermediate link would be guessing.
      shouldCheck = baseHasNullabilityEvidence(objectNode, sourceCode.getScope(node));

      if (shouldCheck && !hasNullCheck(node, sourceCode)) {
        const nodeKey = getMemberExpressionKey(node);
        if (reportedMemberExpressions.has(nodeKey)) {
          return; // Already reported
        }

        try {
          reportedMemberExpressions.add(nodeKey);
          context.report({
            node,
            messageId: 'missingNullCheck',
            suggest: [
              {
                messageId: 'useOptionalChaining',
                fix: () => null,
              },
              {
                messageId: 'useNullishCoalescing',
                fix: () => null,
              },
              {
                messageId: 'addExplicitCheck',
                fix: () => null,
              },
            ],
          });
        } catch {
          // Silently skip if there's an error
          return;
        }
      }
    }

    /**
     * Check call expressions for null safety (e.g., obj.method())
     * Only check if it's an actual method call, not just a property access
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      // Ensure this is actually a CallExpression (not just a MemberExpression)
      if (node.type !== 'CallExpression') {
        return;
      }

      // Only check if callee is a member expression (e.g., obj.method())
      // This ensures we only check method calls, not property accesses
      if (node.callee.type === 'MemberExpression') {
        const memberExpr = node.callee;

        // Skip if already using optional chaining
        if (memberExpr.optional) {
          return;
        }

        // Skip if parent is optional chaining
        const parent = (
          memberExpr as TSESTree.Node & { parent?: TSESTree.Node }
        ).parent;
        if (parent && parent.type === 'ChainExpression') {
          return;
        }

        // Skip if this MemberExpression was already reported by checkMemberExpression
        // We can't easily check this, so we'll rely on the fact that CallExpression
        // is only triggered for actual method calls, not property accesses

        // Check if object might be null/undefined
        const objectNode = memberExpr.object;
        let shouldCheck = false;

        // Evidence-based: see nullabilityEvidence. Only the BASE of a chain is
        // asked, because that is the only link this file can say anything about
        // — `a.b.c` says nothing about `a.b`.
        shouldCheck = baseHasNullabilityEvidence(objectNode, sourceCode.getScope(memberExpr));

        if (shouldCheck && !hasNullCheck(memberExpr, sourceCode)) {
          const nodeKey = getMemberExpressionKey(memberExpr);
          if (reportedMemberExpressions.has(nodeKey)) {
            return; // Already reported by checkMemberExpression
          }

          try {
            reportedMemberExpressions.add(nodeKey);
            context.report({
              node: memberExpr,
              messageId: 'missingNullCheck',
              suggest: [
                {
                  messageId: 'useOptionalChaining',
                  fix: () => null,
                },
                {
                  messageId: 'useNullishCoalescing',
                  fix: () => null,
                },
                {
                  messageId: 'addExplicitCheck',
                  fix: () => null,
                },
              ],
            });
          } catch {
            // Silently skip if there's an error
            return;
          }
        }
      }
    }

    return {
      MemberExpression: checkMemberExpression,
      CallExpression: checkCallExpression,
    };
  },
});

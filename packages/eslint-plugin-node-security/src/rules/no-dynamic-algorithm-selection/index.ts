/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License.
 */

/**
 * ESLint Rule: no-dynamic-algorithm-selection
 * CWE-327: Use of a Broken or Risky Cryptographic Algorithm
 *
 * Detects crypto.createHash(), crypto.createCipheriv(), crypto.createSign(),
 * and similar Node crypto APIs where the algorithm name comes from a dynamic
 * value (variable, request param, config value) rather than a literal string.
 *
 * An attacker who controls the algorithm parameter can:
 * - Downgrade to a weak algorithm (MD5, SHA1, RC4)
 * - Cause a crash with an unsupported algorithm name
 * - Bypass security controls that assume a strong algorithm is in use
 *
 * Detection: structural-api, plus a same-file constant fold.
 *   crypto.createHash(req.query.algo)  → fires (dynamic first arg)
 *   crypto.createHash('sha256')         → silent (literal, checked separately)
 *   crypto.createHash(`sha256`)         → silent (static template)
 *   crypto.createHash(algo)             → silent when `algo` folds to a literal
 *   crypto.createHash(hashOf(alg))      → silent when the local helper returns a
 *                                         closed union of string literals
 *
 * ## Why folding, and not just "is it a literal at the call site"
 *
 * `Shopify/cli` `packages/eslint-plugin-cli/rules/no-inline-graphql.js:44`:
 *
 * ```js
 * function hashFileSync(filePath, algorithm = 'sha256') {
 *   const hash = crypto.createHash(algorithm)
 * ```
 *
 * `hashFileSync` is a file-local helper and its one call site passes a single
 * argument, so `algorithm` is the literal `'sha256'` on every execution. There
 * is no downgrade to be had: the parameter is never supplied by anyone. The
 * rule reported it anyway, because it asked what the argument LOOKS like rather
 * than what it can BE.
 *
 * Two resolutions are now attempted before reporting, both in
 * `utils/constant-folding` and both same-file only:
 *   1. the argument folds to a literal (`const` binding, ternary, `for…of` row);
 *   2. the argument is a parameter whose default is a literal and whose function
 *      is never called with an argument in that position, and never escapes.
 *
 * Everything else still reports. An unresolved algorithm name is unresolved,
 * not safe.
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

import {
  makeIsLiteralConstant,
  parameterIsAlwaysDefault,
} from '../../utils/constant-folding';
import {
  constInitializerOf,
  isClosedStringTableLookup,
} from '../../utils/const-value';
import { moduleExportName } from '../../utils/module-binding';

type MessageIds = 'dynamicAlgorithm';

/** Node crypto functions whose first argument is the algorithm name. */
const CRYPTO_ALGORITHM_FUNCTIONS = new Set([
  'createHash',
  'createHmac',
  'createSign',
  'createVerify',
  'createCipher',
  'createCipheriv',
  'createDecipher',
  'createDecipheriv',
]);

/** A string literal type, or a union made only of them: a set the author wrote down. */
function isClosedLiteralType(type: TSESTree.TypeNode | undefined): boolean {
  if (!type) return false;
  if (type.type === AST_NODE_TYPES.TSLiteralType) {
    return (
      type.literal.type === AST_NODE_TYPES.Literal &&
      typeof type.literal.value === 'string'
    );
  }
  return (
    type.type === AST_NODE_TYPES.TSUnionType &&
    type.types.every((member) => isClosedLiteralType(member))
  );
}

/**
 * A parameter declared with a closed literal type and never reassigned. The
 * compiler holds every caller to that set; a caller that escapes it needs a cast
 * of its own, which is where a finding belongs.
 */
function isClosedParameter(
  sourceCode: Readonly<TSESLint.SourceCode>,
  identifier: TSESTree.Identifier,
): boolean {
  let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(identifier);
  while (scope) {
    const variable = scope.set.get(identifier.name);
    if (variable) {
      if (variable.defs.length !== 1) return false;
      const [def] = variable.defs;
      return (
        def.type === 'Parameter' &&
        def.name.type === AST_NODE_TYPES.Identifier &&
        isClosedLiteralType(def.name.typeAnnotation?.typeAnnotation) &&
        variable.references.every((ref) => !ref.isWrite())
      );
    }
    scope = scope.upper;
  }
  return false;
}

/**
 * `Algo.Strong` where `enum Algo { Strong = 'aes-256-gcm' }` is declared in this
 * file, or a `const` that holds one.
 *
 * An enum is the allowlist written as a declaration: every member the author
 * listed carries a string literal, so a member read can only produce an
 * algorithm they wrote down. The enum must be declared once in this file (a
 * merged or imported one is not fully visible), and the member read must be
 * static: `Algo[req.query.a]` can name any member a caller invents.
 */
function isEnumStringMember(
  sourceCode: Readonly<TSESLint.SourceCode>,
  node: TSESTree.Node,
  depth = 0,
): boolean {
  if (depth > 4) return false;
  if (node.type === AST_NODE_TYPES.Identifier) {
    const init = constInitializerOf(sourceCode, node);
    return init !== null && isEnumStringMember(sourceCode, init, depth + 1);
  }
  if (
    node.type !== AST_NODE_TYPES.MemberExpression ||
    node.object.type !== AST_NODE_TYPES.Identifier
  ) {
    return false;
  }
  const member = node.computed
    ? node.property.type === AST_NODE_TYPES.Literal &&
      typeof node.property.value === 'string'
      ? node.property.value
      : null
    : // `Algo.#x` is a PrivateIdentifier, which has a `name` all the same.
      (node.property as TSESTree.Identifier).name;
  if (member === null) return false;
  let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
  while (scope) {
    const variable = scope.set.get(node.object.name);
    if (variable) {
      const [def, ...rest] = variable.defs;
      if (def?.type !== 'TSEnumName' || rest.length > 0) return false;
      return (def.node as TSESTree.TSEnumDeclaration).body.members.some(
        (entry) =>
          (entry.id.type === AST_NODE_TYPES.Identifier
            ? entry.id.name
            : entry.id.value) === member &&
          entry.initializer?.type === AST_NODE_TYPES.Literal &&
          typeof entry.initializer.value === 'string',
      );
    }
    scope = scope.upper;
  }
  return false;
}

/**
 * Can this expression only produce values computed from string literals and
 * closed-typed parameters? `` `sha${alg.slice(2)}` `` over
 * `alg: 'HS256' | 'HS512'` can; `req.query.algorithm` cannot.
 */
function derivesFromClosedValues(
  sourceCode: Readonly<TSESLint.SourceCode>,
  node: TSESTree.Node,
): boolean {
  switch (node.type) {
    case AST_NODE_TYPES.Literal:
      return typeof node.value === 'string' || typeof node.value === 'number';
    case AST_NODE_TYPES.TemplateLiteral:
      return node.expressions.every((expr) =>
        derivesFromClosedValues(sourceCode, expr),
      );
    case AST_NODE_TYPES.Identifier:
      return isClosedParameter(sourceCode, node);
    case AST_NODE_TYPES.ConditionalExpression:
      return (
        derivesFromClosedValues(sourceCode, node.consequent) &&
        derivesFromClosedValues(sourceCode, node.alternate)
      );
    case AST_NODE_TYPES.CallExpression:
      // `alg.slice(2)`: a method of a closed value, with literal arguments.
      return (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        !node.callee.computed &&
        derivesFromClosedValues(sourceCode, node.callee.object) &&
        node.arguments.every(
          (arg) =>
            arg.type === AST_NODE_TYPES.Literal &&
            derivesFromClosedValues(sourceCode, arg),
        )
      );
    default:
      return false;
  }
}

/**
 * `x satisfies 'sha256' | 'sha512'`, which the compiler checks, or
 * `x as 'sha256' | 'sha512'` when `x` itself is built only from closed values.
 * An `as` is erased at runtime, so on its own it proves nothing:
 * `req.query.algorithm as 'sha256'` is still whatever the request sent.
 */
function isClosedLiteralCast(
  sourceCode: Readonly<TSESLint.SourceCode>,
  node: TSESTree.Node,
): boolean {
  if (node.type === AST_NODE_TYPES.TSSatisfiesExpression) {
    // `satisfies` is checked, but against the type an inner `as` claims:
    // `(req.query.alg as 'sha256') satisfies 'sha256'` is still the request.
    return (
      isClosedLiteralType(node.typeAnnotation) &&
      !hasUncheckedAssertion(sourceCode, node.expression)
    );
  }
  // `<'sha256'>x` is the same assertion as `x as 'sha256'`, spelled the old way.
  return (
    (node.type === AST_NODE_TYPES.TSAsExpression ||
      node.type === AST_NODE_TYPES.TSTypeAssertion) &&
    isClosedLiteralType(node.typeAnnotation) &&
    derivesFromClosedValues(sourceCode, node.expression)
  );
}

/**
 * Does this subtree (outside nested functions) hold a type assertion the
 * compiler takes on trust? `value as 'sha256'` and `<'sha256'>value` are erased
 * at runtime, so a declared closed return type proves nothing once the body
 * asserts its way there. `as const` and a cast of a closed value are fine.
 */
function hasUncheckedAssertion(
  sourceCode: Readonly<TSESLint.SourceCode>,
  node: TSESTree.Node,
): boolean {
  if (
    node.type === AST_NODE_TYPES.TSAsExpression ||
    node.type === AST_NODE_TYPES.TSTypeAssertion
  ) {
    const asConst = sourceCode.getText(node.typeAnnotation) === 'const';
    if (!asConst && !derivesFromClosedValues(sourceCode, node.expression)) {
      return true;
    }
  }
  return sourceCode.visitorKeys[node.type].some((key) => {
    const child = (node as unknown as Record<string, unknown>)[key];
    const children = Array.isArray(child) ? child : [child];
    return children.some(
      (c: unknown) =>
        typeof c === 'object' &&
        c !== null &&
        'type' in c &&
        !isFunctionNode(c as TSESTree.Node) &&
        hasUncheckedAssertion(sourceCode, c as TSESTree.Node),
    );
  });
}

function isFunctionNode(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    node.type === AST_NODE_TYPES.FunctionDeclaration ||
    node.type === AST_NODE_TYPES.FunctionExpression
  );
}

type FunctionNode =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression;

/**
 * A function whose declared return type (checked by the compiler against every
 * return), or whose expression body, is a closed literal set.
 */
function returnsClosedLiteral(
  sourceCode: Readonly<TSESLint.SourceCode>,
  fn: FunctionNode,
): boolean {
  if (isClosedLiteralType(fn.returnType?.typeAnnotation)) {
    return !hasUncheckedAssertion(sourceCode, fn.body);
  }
  return (
    fn.type === AST_NODE_TYPES.ArrowFunctionExpression &&
    fn.expression &&
    isClosedLiteralCast(sourceCode, fn.body)
  );
}

/**
 * The same-file function a call names, when the binding can never point anywhere else:
 * a function declaration, or a `const` initialised with a function.
 */
function calledLocalFunction(
  sourceCode: Readonly<TSESLint.SourceCode>,
  call: TSESTree.CallExpression,
): FunctionNode | null {
  if (call.callee.type !== AST_NODE_TYPES.Identifier) return null;
  const name = call.callee.name;
  let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(call);
  while (scope) {
    const variable = scope.set.get(name);
    if (variable) {
      if (variable.defs.length !== 1) return null;
      const [def] = variable.defs;
      // `def.type` first: a parameter's definition also points at its
      // enclosing function, and `pick` in `function build(pick)` is not `build`.
      if (
        def.type === 'FunctionName' &&
        def.node.type === AST_NODE_TYPES.FunctionDeclaration
      ) {
        return def.node;
      }
      if (
        def.type === 'Variable' &&
        def.node.type === AST_NODE_TYPES.VariableDeclarator &&
        def.parent?.type === AST_NODE_TYPES.VariableDeclaration &&
        def.parent.kind === 'const' &&
        (def.node.init?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          def.node.init?.type === AST_NODE_TYPES.FunctionExpression)
      ) {
        return def.node.init;
      }
      return null;
    }
    scope = scope.upper;
  }
  return null;
}

export const noDynamicAlgorithmSelection = createRule<[], MessageIds>({
  name: 'no-dynamic-algorithm-selection',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-dynamic-algorithm-selection.md',
      description:
        'Disallow dynamic algorithm names in Node.js crypto functions (CWE-327)',
      cwe: 'CWE-327',
      // Match the CVSS the finding emits: the message sets no per-message
      // cvss, so it inherits CWE_MAPPING['CWE-327'] (7.5) via enrichFromCWE.
      // Locked by security-cvss-docs-consistency.lock.test.ts.
      cvss: 7.5,
    },
    messages: {
      dynamicAlgorithm: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dynamic Cryptographic Algorithm (CWE-327)',
        cwe: 'CWE-327',
        description:
          '`crypto.{{method}}()` receives a dynamic algorithm name. An attacker who controls this value can downgrade to a weak algorithm (MD5, SHA1, RC4) or cause a crash.',
        severity: 'HIGH',
        fix: 'Hard-code the algorithm name as a literal string (e.g. "sha256", "aes-256-gcm"). Use an allowlist if the algorithm must vary at runtime.',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, []>) {
    let sourceCode: Readonly<TSESLint.SourceCode>;
    let isLiteralConstant: (node: TSESTree.Node) => boolean;

    /**
     * Can this algorithm name be anything other than a literal in this file?
     *
     * Scope references are complete before any rule visitor runs, so the call
     * sites a parameter default depends on are all visible here — no
     * `Program:exit` deferral is needed.
     */
    const resolvesToLiteral = (node: TSESTree.Node): boolean => {
      if (isLiteralConstant(node)) return true;
      // The documented allowlist: a lookup into a const table of string
      // literals can only yield an algorithm the author wrote down.
      if (isClosedStringTableLookup(sourceCode, node)) return true;
      // A union of string literals is the same allowlist written as a type:
      // `name as 'sha256' | 'sha512'`, or a same-file helper whose return is
      // one (nestjs/authentication's `hashOf(alg)`).
      if (isClosedLiteralCast(sourceCode, node)) return true;
      // An enum of string literals declared in this file, written the same way.
      if (isEnumStringMember(sourceCode, node)) return true;
      if (node.type === AST_NODE_TYPES.CallExpression) {
        const fn = calledLocalFunction(sourceCode, node);
        if (fn && returnsClosedLiteral(sourceCode, fn)) return true;
      }
      return (
        node.type === AST_NODE_TYPES.Identifier &&
        parameterIsAlwaysDefault(sourceCode, node, isLiteralConstant)
      );
    };

    return {
      before() {
        sourceCode = context.sourceCode;
        isLiteralConstant = makeIsLiteralConstant(sourceCode);
      },
      CallExpression(node: TSESTree.CallExpression) {
        const { callee, arguments: args } = node;

        // The callee has to RESOLVE to a node:crypto export: `crypto.createHash`,
        // `crypto['createHash']`, a named or renamed import, a destructured
        // require, a namespace import. A local object that merely has a
        // `createHash` method is not crypto, whatever it is called.
        const methodName = moduleExportName(
          callee,
          sourceCode.getScope(node),
          'crypto',
        );
        if (methodName === null) return;
        if (!CRYPTO_ALGORITHM_FUNCTIONS.has(methodName)) return;

        const firstArg = args[0];
        if (!firstArg) return;

        // A literal at the call site, a `const` that folds to one, or a
        // parameter default no caller overrides — all the same fact: the
        // algorithm is an intentional, auditable choice written in this file.
        // Weak literal choices are `no-weak-hash-algorithm`'s job, not this
        // rule's; this one is only about who gets to pick.
        if (resolvesToLiteral(firstArg)) return;

        context.report({
          node: firstArg,
          messageId: 'dynamicAlgorithm',
          data: { method: methodName },
        });
      },
    };
  },
});

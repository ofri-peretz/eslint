/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-modulo-biased-random
 * Detects a cryptographically random byte or word reduced with `%` to pick a
 * character or element, when the divisor does not divide the source range.
 * CWE-330: Use of Insufficiently Random Values
 *
 * `crypto.randomBytes(n)` yields bytes uniform over 0..255. `b % 70` maps 256
 * values onto 70 slots, so the first 46 slots get 4 values each and the other
 * 24 get 3: some characters of the generated secret are a third more likely
 * than others. The fix is `crypto.randomInt(n)`, or rejection sampling (drop
 * bytes at or above the largest multiple of n).
 *
 * ## What is reported
 *
 * A `%` whose left side is an element of a random collection and whose result
 * indexes something (`chars[b % n]`, `chars.charAt(b % n)`,
 * `String.fromCharCode(base + b % n)`) or becomes text (`${b % 10}`,
 * `String(b % 10)`, `(b % 10).toString()`), when `n` is not known to divide
 * the element's range. The element is followed by structure from its source:
 *
 * - sources: `randomBytes(n)` from `crypto` (range 256), and
 *   `getRandomValues(array)` from `crypto.webcrypto` or the global `crypto`,
 *   whose range is the typed array's (256, 65536 or 2^32);
 * - collections: the source call, a variable initialised with it,
 *   `Array.from(c)`, `[...c]`, `c.slice()`, `c.subarray()`, and a typed array
 *   that is passed to `getRandomValues`;
 * - elements: `c[i]`, `c.readUInt8|16|32(..)`, the variable of a `for…of`
 *   over `c`, the first parameter of a callback given to `c.map` (and the other
 *   element-wise array methods) or to `Array.from(c, cb)`, and a variable
 *   initialised with an element.
 *
 * A divisor is known when it is a number literal, a `const` bound to one, or
 * the `.length` of a `const` string. An unknown divisor is reported: the
 * message says the bias depends on it.
 *
 * ## What is not reported
 *
 * - A divisor that divides the range (`b % 16`, `b % 64`), or that is at least
 *   the range.
 * - Rejection sampling: the same element compared with `<`, `<=`, `>` or `>=`
 *   in the same function (`if (b < cutoff) out += chars[b % chars.length]`).
 * - A `%` whose result neither indexes nor becomes text (jitter, sharding).
 *
 * @see https://cwe.mitre.org/data/definitions/330.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { findVariable } from '../../utils/provenance';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';

type MessageIds = 'moduloBiasedRandom';

type RuleOptions = [];

/**
 * @protocol-constant Unsigned typed arrays and the size of their element range
 */
const TYPED_ARRAY_RANGE: ReadonlyMap<string, number> = new Map([
  ['Uint8Array', 2 ** 8],
  ['Uint8ClampedArray', 2 ** 8],
  ['Uint16Array', 2 ** 16],
  ['Uint32Array', 2 ** 32],
]);

/**
 * @protocol-constant Buffer read methods and the size of the unsigned range they return
 */
const BUFFER_READ_RANGE: ReadonlyMap<string, number> = new Map([
  ['readUInt8', 2 ** 8],
  ['readUint8', 2 ** 8],
  ['readUInt16BE', 2 ** 16],
  ['readUInt16LE', 2 ** 16],
  ['readUint16BE', 2 ** 16],
  ['readUint16LE', 2 ** 16],
  ['readUInt32BE', 2 ** 32],
  ['readUInt32LE', 2 ** 32],
  ['readUint32BE', 2 ** 32],
  ['readUint32LE', 2 ** 32],
]);

/**
 * @protocol-constant Array.prototype methods whose callback receives each element first
 */
const ELEMENT_CALLBACK_METHODS: ReadonlySet<string> = new Set([
  'map',
  'flatMap',
  'forEach',
  'filter',
  'some',
  'every',
  'find',
  'findIndex',
]);

/**
 * @protocol-constant Array and TypedArray methods that return a copy of the same elements
 */
const COPYING_METHODS: ReadonlySet<string> = new Set(['slice', 'subarray']);

/**
 * @protocol-constant String methods that take a position to read from
 */
const POSITION_METHODS: ReadonlySet<string> = new Set([
  'charAt',
  'at',
  'charCodeAt',
  'codePointAt',
]);

/** @protocol-constant The relational operators a rejection test is written with */
const RELATIONAL_OPERATORS: ReadonlySet<string> = new Set([
  '<',
  '<=',
  '>',
  '>=',
]);

/** @protocol-constant Globals that hold the Web Crypto object in a browser or Node */
const GLOBAL_OBJECTS: ReadonlySet<string> = new Set([
  'globalThis',
  'window',
  'self',
]);

type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

function isFunction(node: TSESTree.Node): node is FunctionNode {
  return (
    node.type === AST_NODE_TYPES.FunctionDeclaration ||
    node.type === AST_NODE_TYPES.FunctionExpression ||
    node.type === AST_NODE_TYPES.ArrowFunctionExpression
  );
}

/** `Array.from` as a callee. */
function isArrayFrom(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.MemberExpression &&
    node.object.type === AST_NODE_TYPES.Identifier &&
    node.object.name === 'Array' &&
    propertyName(node) === 'from'
  );
}

export const noModuloBiasedRandom = createRule<RuleOptions, MessageIds>({
  name: 'no-modulo-biased-random',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-modulo-biased-random.md',
      description:
        'Disallow reducing a random byte with % when the divisor does not divide its range',
      cwe: 'CWE-330',
      cvss: 5.3,
    },
    hasSuggestions: false,
    messages: {
      moduloBiasedRandom: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Modulo-biased random pick',
        cwe: 'CWE-330',
        cvss: 5.3,
        description:
          'A random value uniform over {{range}} values is reduced with % {{divisor}}. {{skew}}',
        severity: 'MEDIUM',
        fix: 'Use crypto.randomInt({{divisor}}), or reject values at or above the largest multiple of {{divisor}} below {{range}} before taking %.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/330.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    /** Is this callee the named crypto export, imported or global? */
    function isCryptoExport(callee: TSESTree.Node, name: string): boolean {
      if (
        callee.type !== AST_NODE_TYPES.Identifier &&
        (callee.type !== AST_NODE_TYPES.MemberExpression ||
          propertyName(callee) !== name)
      ) {
        return false;
      }
      const bound = resolveModuleBinding(
        callee,
        context.sourceCode.getScope(callee),
      );
      if (bound?.module === 'crypto') {
        const path =
          bound.path[0] === 'default' ? bound.path.slice(1) : bound.path;
        return (
          (path.length === 1 && path[0] === name) ||
          (path.length === 2 && path[0] === 'webcrypto' && path[1] === name)
        );
      }
      // The global Web Crypto object: `crypto.x`, `globalThis.crypto.x`.
      if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
      const holder = callee.object;
      if (holder.type === AST_NODE_TYPES.Identifier) {
        return (
          holder.name === 'crypto' &&
          (findVariable(context.sourceCode, holder)?.defs.length ?? 0) === 0
        );
      }
      return (
        holder.type === AST_NODE_TYPES.MemberExpression &&
        propertyName(holder) === 'crypto' &&
        holder.object.type === AST_NODE_TYPES.Identifier &&
        GLOBAL_OBJECTS.has(holder.object.name) &&
        (findVariable(context.sourceCode, holder.object)?.defs.length ?? 0) ===
          0
      );
    }

    /** The element range of a typed array built with `new Uint8Array(n)`. */
    function typedArrayRange(node: TSESTree.Node, depth = 0): number | null {
      if (depth > 4) return null;
      if (
        node.type === AST_NODE_TYPES.NewExpression &&
        node.callee.type === AST_NODE_TYPES.Identifier
      ) {
        return TYPED_ARRAY_RANGE.get(node.callee.name) ?? null;
      }
      if (node.type === AST_NODE_TYPES.Identifier) {
        const init = singleInit(node);
        return init ? typedArrayRange(init, depth + 1) : null;
      }
      return null;
    }

    /** The initializer of a variable bound once, or null. */
    function singleInit(node: TSESTree.Identifier): TSESTree.Node | null {
      const variable = findVariable(context.sourceCode, node);
      if (!variable || variable.defs.length !== 1) return null;
      const def = variable.defs[0];
      if (def.type !== 'Variable') return null;
      const declarator = def.node as TSESTree.VariableDeclarator;
      if (declarator.id.type !== AST_NODE_TYPES.Identifier) return null;
      return declarator.init ?? null;
    }

    /** Is this typed array passed to `getRandomValues` anywhere? */
    function isFilledWithRandom(node: TSESTree.Identifier): boolean {
      const variable = findVariable(context.sourceCode, node);
      return (
        variable?.references.some((ref) => {
          const parent = ref.identifier.parent;
          return (
            parent?.type === AST_NODE_TYPES.CallExpression &&
            parent.arguments[0] === ref.identifier &&
            isCryptoExport(parent.callee, 'getRandomValues')
          );
        }) ?? false
      );
    }

    /** The element range of a random collection, or null if it is not one. */
    function collectionRange(node: TSESTree.Node, depth = 0): number | null {
      if (depth > 4) return null;
      if (node.type === AST_NODE_TYPES.AwaitExpression) {
        return collectionRange(node.argument, depth + 1);
      }
      if (node.type === AST_NODE_TYPES.CallExpression) {
        if (isCryptoExport(node.callee, 'randomBytes')) return 2 ** 8;
        if (isCryptoExport(node.callee, 'getRandomValues')) {
          const arg = node.arguments[0];
          return arg ? typedArrayRange(arg) : null;
        }
        if (isArrayFrom(node.callee) && node.arguments[0]) {
          return collectionRange(node.arguments[0], depth + 1);
        }
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          COPYING_METHODS.has(propertyName(node.callee) ?? '')
        ) {
          return collectionRange(node.callee.object, depth + 1);
        }
        return null;
      }
      if (
        node.type === AST_NODE_TYPES.ArrayExpression &&
        node.elements.length === 1 &&
        node.elements[0]?.type === AST_NODE_TYPES.SpreadElement
      ) {
        return collectionRange(node.elements[0].argument, depth + 1);
      }
      if (node.type === AST_NODE_TYPES.Identifier) {
        const init = singleInit(node);
        if (!init) return null;
        if (isFilledWithRandom(node)) {
          const range = typedArrayRange(init);
          if (range !== null) return range;
        }
        return collectionRange(init, depth + 1);
      }
      return null;
    }

    /** The range of a random element, or null if this is not one. */
    function elementRange(node: TSESTree.Node, depth = 0): number | null {
      if (depth > 4) return null;
      if (node.type === AST_NODE_TYPES.MemberExpression && node.computed) {
        return collectionRange(node.object);
      }
      if (
        node.type === AST_NODE_TYPES.CallExpression &&
        node.callee.type === AST_NODE_TYPES.MemberExpression
      ) {
        const read = BUFFER_READ_RANGE.get(propertyName(node.callee) ?? '');
        return read !== undefined &&
          collectionRange(node.callee.object) !== null
          ? read
          : null;
      }
      if (node.type !== AST_NODE_TYPES.Identifier) return null;
      const variable = findVariable(context.sourceCode, node);
      if (!variable || variable.defs.length !== 1) return null;
      const def = variable.defs[0];
      if (def.type === 'Variable') {
        const declarator = def.node as TSESTree.VariableDeclarator;
        if (declarator.id.type !== AST_NODE_TYPES.Identifier) return null;
        const statement = declarator.parent;
        // for (const b of bytes)
        if (
          statement?.parent?.type === AST_NODE_TYPES.ForOfStatement &&
          statement.parent.left === statement
        ) {
          return collectionRange(statement.parent.right);
        }
        return declarator.init
          ? elementRange(declarator.init, depth + 1)
          : null;
      }
      if (def.type === 'Parameter') {
        const fn = def.node as TSESTree.Node;
        if (!isFunction(fn) || fn.params[0] !== def.name) return null;
        const call = fn.parent;
        if (call?.type !== AST_NODE_TYPES.CallExpression) return null;
        // bytes.map((b) => …)
        if (
          call.arguments[0] === fn &&
          call.callee.type === AST_NODE_TYPES.MemberExpression &&
          ELEMENT_CALLBACK_METHODS.has(propertyName(call.callee) ?? '')
        ) {
          return collectionRange(call.callee.object);
        }
        // Array.from(bytes, (b) => …)
        if (call.arguments[1] === fn && isArrayFrom(call.callee)) {
          return collectionRange(call.arguments[0]);
        }
      }
      return null;
    }

    /** The divisor's value when it is known at lint time. */
    function divisorValue(node: TSESTree.Node, depth = 0): number | null {
      if (depth > 4) return null;
      if (
        node.type === AST_NODE_TYPES.Literal &&
        typeof node.value === 'number'
      ) {
        return node.value;
      }
      if (node.type === AST_NODE_TYPES.Identifier) {
        const variable = findVariable(context.sourceCode, node);
        const def = variable?.defs.length === 1 ? variable.defs[0] : undefined;
        if (def?.type !== 'Variable' || def.parent?.kind !== 'const')
          return null;
        const init = (def.node as TSESTree.VariableDeclarator).init;
        return init ? divisorValue(init, depth + 1) : null;
      }
      if (
        node.type === AST_NODE_TYPES.MemberExpression &&
        propertyName(node) === 'length'
      ) {
        const text = constString(node.object);
        return text === null ? null : text.length;
      }
      return null;
    }

    /** The value of a `const` string, a literal, or a concatenation of them. */
    function constString(node: TSESTree.Node, depth = 0): string | null {
      if (depth > 8) return null;
      if (
        node.type === AST_NODE_TYPES.Literal &&
        typeof node.value === 'string'
      ) {
        return node.value;
      }
      if (
        node.type === AST_NODE_TYPES.TemplateLiteral &&
        node.expressions.length === 0
      ) {
        return node.quasis[0]?.value.cooked ?? null;
      }
      if (
        node.type === AST_NODE_TYPES.BinaryExpression &&
        node.operator === '+'
      ) {
        const left = constString(node.left, depth + 1);
        const right = left === null ? null : constString(node.right, depth + 1);
        return right === null ? null : (left as string) + right;
      }
      if (node.type === AST_NODE_TYPES.Identifier) {
        const variable = findVariable(context.sourceCode, node);
        const def = variable?.defs.length === 1 ? variable.defs[0] : undefined;
        if (def?.type !== 'Variable' || def.parent?.kind !== 'const')
          return null;
        const init = (def.node as TSESTree.VariableDeclarator).init;
        return init ? constString(init, depth + 1) : null;
      }
      return null;
    }

    /**
     * Does the `%` result pick a position (an index, a char read, a char
     * code) or become text (a template, `String()`, `.toString()`)?
     */
    function picksPosition(node: TSESTree.Node): boolean {
      let child: TSESTree.Node = node;
      let parent = node.parent;
      // String.fromCharCode(65 + b % 26)
      if (
        parent?.type === AST_NODE_TYPES.BinaryExpression &&
        parent.operator === '+'
      ) {
        child = parent;
        parent = parent.parent;
        return (
          parent?.type === AST_NODE_TYPES.CallExpression &&
          parent.arguments.includes(child as TSESTree.Expression) &&
          parent.callee.type === AST_NODE_TYPES.MemberExpression &&
          propertyName(parent.callee) === 'fromCharCode'
        );
      }
      if (
        parent?.type === AST_NODE_TYPES.MemberExpression &&
        parent.computed &&
        parent.property === child
      ) {
        return true;
      }
      // A digit or code written into a string: `${b % 10}`, String(b % 10),
      // (b % 10).toString().
      if (parent?.type === AST_NODE_TYPES.TemplateLiteral) return true;
      if (
        parent?.type === AST_NODE_TYPES.CallExpression &&
        parent.arguments[0] === child &&
        parent.callee.type === AST_NODE_TYPES.Identifier &&
        parent.callee.name === 'String' &&
        (findVariable(context.sourceCode, parent.callee)?.defs.length ?? 0) ===
          0
      ) {
        return true;
      }
      if (
        parent?.type === AST_NODE_TYPES.MemberExpression &&
        parent.object === child &&
        propertyName(parent) === 'toString' &&
        parent.parent?.type === AST_NODE_TYPES.CallExpression
      ) {
        return true;
      }
      return (
        parent?.type === AST_NODE_TYPES.CallExpression &&
        parent.arguments[0] === child &&
        parent.callee.type === AST_NODE_TYPES.MemberExpression &&
        (POSITION_METHODS.has(propertyName(parent.callee) ?? '') ||
          propertyName(parent.callee) === 'fromCharCode')
      );
    }

    /** The innermost function (or the program) holding this node. */
    function enclosingBody(node: TSESTree.Node): TSESTree.Node {
      let current = node.parent;
      while (current && !isFunction(current)) {
        if (current.type === AST_NODE_TYPES.Program) return current;
        current = current.parent;
      }
      return current ?? node;
    }

    /**
     * Rejection sampling: the same element compared with a relational
     * operator in the same function.
     */
    function isRejectionSampled(element: TSESTree.Node): boolean {
      const text = context.sourceCode.getText(element);
      const body = enclosingBody(element);
      let found = false;
      const visit = (node: TSESTree.Node): void => {
        if (found) return;
        if (
          node.type === AST_NODE_TYPES.BinaryExpression &&
          RELATIONAL_OPERATORS.has(node.operator) &&
          [node.left, node.right].some((side) => sameValue(side, element, text))
        ) {
          found = true;
          return;
        }
        for (const [key, value] of Object.entries(node)) {
          if (key === 'parent') continue;
          const children = Array.isArray(value) ? value : [value];
          for (const child of children) {
            if (
              child &&
              typeof child === 'object' &&
              typeof (child as TSESTree.Node).type === 'string' &&
              !(isFunction(child as TSESTree.Node) && child !== body)
            ) {
              visit(child as TSESTree.Node);
            }
          }
        }
      };
      visit(isFunction(body) ? body.body : body);
      return found;
    }

    /** The same variable, or the same element expression over it. */
    function sameValue(
      side: TSESTree.Node,
      element: TSESTree.Node,
      text: string,
    ): boolean {
      if (
        side.type === AST_NODE_TYPES.Identifier &&
        element.type === AST_NODE_TYPES.Identifier
      ) {
        const variable = findVariable(context.sourceCode, element);
        return (
          variable !== null &&
          findVariable(context.sourceCode, side) === variable
        );
      }
      return (
        side.type === element.type && context.sourceCode.getText(side) === text
      );
    }

    function skewOf(range: number, divisor: number): string {
      const low = Math.floor(range / divisor);
      const favoured = range % divisor;
      return `The first ${favoured} of ${divisor} results each come up ${low + 1} times in ${range}, the other ${divisor - favoured} only ${low} times, so the pick is biased.`;
    }

    return {
      BinaryExpression(node: TSESTree.BinaryExpression) {
        if (node.operator !== '%') return;
        const range = elementRange(node.left);
        if (range === null || !picksPosition(node)) return;
        const divisor = divisorValue(node.right);
        if (
          divisor !== null &&
          (divisor <= 0 || divisor >= range || range % divisor === 0)
        ) {
          return;
        }
        if (isRejectionSampled(node.left)) return;
        context.report({
          node,
          messageId: 'moduloBiasedRandom',
          data: {
            range: String(range),
            divisor:
              divisor === null
                ? context.sourceCode.getText(node.right)
                : String(divisor),
            skew:
              divisor === null
                ? `Unless that divisor divides ${range}, some results come up more often than others.`
                : skewOf(range, divisor),
          },
        });
      },
    };
  },
});

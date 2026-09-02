/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow `new Buffer()` and `Buffer()` constructor (deprecated since Node 10).
 *
 * The `Buffer` constructor and the `Buffer()` factory call return uninitialized
 * memory when given a number argument — which has caused real vulnerabilities
 * including CVE-2018-7166 (uninitialized memory disclosure in randomFillSync
 * fallback). The constructor is deprecated in Node 10+ and emits a runtime
 * deprecation warning. Use `Buffer.alloc(size)`, `Buffer.allocUnsafe(size)`,
 * `Buffer.from(value)`, or `Buffer.concat()` instead.
 *
 * @see https://nodejs.org/api/buffer.html#bufnew-buffersize
 * @see https://nvd.nist.gov/vuln/detail/CVE-2018-7166
 * @see https://cwe.mitre.org/data/definitions/676.html
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';
import { resolveConstant } from '../../utils/const-value';
import { findVariable } from '../../utils/provenance';

type MessageIds = 'deprecatedBufferConstructor' | 'deprecatedBufferCall';

/** The two specifiers that resolve to Node's built-in `buffer` module. */
const BUFFER_MODULES: ReadonlySet<string> = new Set(['buffer', 'node:buffer']);

/** `require('buffer')` / `require('node:buffer')`. */
function isBufferModuleRequire(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.CallExpression &&
    node.callee.type === AST_NODE_TYPES.Identifier &&
    node.callee.name === 'require' &&
    node.arguments[0]?.type === AST_NODE_TYPES.Literal &&
    typeof node.arguments[0].value === 'string' &&
    BUFFER_MODULES.has(node.arguments[0].value)
  );
}

/**
 * Was this binding imported from `buffer` / `node:buffer`?
 *
 * `import Buffer = require('buffer')` (TypeScript's own import-equals form)
 * carries its specifier somewhere else entirely and binds the module object
 * rather than the constructor, so it is left unresolved.
 */
function fromBufferModule(def: TSESLint.Scope.Definitions.ImportBindingDefinition): boolean {
  const declaration = def.parent;
  return (
    declaration.type === AST_NODE_TYPES.ImportDeclaration &&
    BUFFER_MODULES.has(declaration.source.value)
  );
}

export const noDeprecatedBuffer: TSESLint.RuleModule<MessageIds, []> = createRule<[], MessageIds>({
  name: 'no-deprecated-buffer',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-deprecated-buffer.md',
      description: 'Disallow the deprecated `new Buffer()` constructor and `Buffer()` factory call.',
      cwe: 'CWE-676',
      cvss: 7.5,
    },
    fixable: 'code',
    messages: {
      deprecatedBufferConstructor: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Deprecated Buffer Constructor',
        cwe: 'CWE-676',
        cvss: 7.5,
        description:
          '`new Buffer()` is deprecated since Node 10 and unsafe — when called with a number it returns uninitialized memory (CVE-2018-7166).',
        severity: 'HIGH',
        fix: 'Use `Buffer.alloc(size)` (zero-filled), `Buffer.allocUnsafe(size)` (only when you immediately overwrite the buffer), or `Buffer.from(value)` (for strings/arrays/buffers).',
        documentationLink: 'https://nodejs.org/api/buffer.html#bufnew-buffersize',
      }),
      deprecatedBufferCall: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Deprecated Buffer() Factory Call',
        cwe: 'CWE-676',
        cvss: 7.5,
        description:
          '`Buffer()` (without `new`) is deprecated since Node 10 and unsafe — when called with a number it returns uninitialized memory.',
        severity: 'HIGH',
        fix: 'Use `Buffer.alloc(size)`, `Buffer.allocUnsafe(size)`, or `Buffer.from(value)`.',
        documentationLink: 'https://nodejs.org/api/buffer.html#bufnew-buffersize',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    /**
     * Does this identifier resolve to Node's own `Buffer` constructor?
     *
     * The rule used to answer `node.name === 'Buffer'`, which is a SPELLING
     * test and got both directions wrong. It reported a module's own
     * `class Buffer` (a ring buffer over a Float32Array) and a
     * `import { Buffer } from './lib/frame-buffer.js'`, and it stayed silent on
     * `import { Buffer as NodeBuffer } from 'node:buffer'` and on
     * `const BufferCtor = require('buffer').Buffer` — the single most common
     * CommonJS spelling in pre-Node-10 packages.
     *
     * The binding is what decides. An unresolved reference (or one resolved to
     * a `globals` entry with no definition in this file) IS the Node global,
     * and only for the exact spelling; anything declared locally is that local
     * declaration unless it was imported or required from `buffer`.
     */
    function resolvesToNodeBuffer(id: TSESTree.Identifier): boolean {
      const variable = findVariable(sourceCode, id);
      if (variable === null || variable.defs.length === 0) return id.name === 'Buffer';
      const def = variable.defs[0];

      if (def.type === 'ImportBinding') {
        // The IMPORTED name is what identifies the constructor;
        // `import { Buffer as NodeBuffer }` is still `Buffer`. A namespace or
        // default specifier binds the module object, handled by
        // `isBufferNamespace` instead.
        return (
          fromBufferModule(def) &&
          def.node.type === AST_NODE_TYPES.ImportSpecifier &&
          def.node.imported.type === AST_NODE_TYPES.Identifier &&
          def.node.imported.name === 'Buffer'
        );
      }

      if (def.type !== 'Variable') return false;
      const init = def.node.init;
      if (init === null) return false;

      // `const BufferCtor = require('buffer').Buffer`
      if (
        init.type === AST_NODE_TYPES.MemberExpression &&
        propertyName(init) === 'Buffer'
      ) {
        return isBufferModuleRequire(init.object);
      }

      // `const { Buffer } = require('buffer')` / `const { Buffer: B } = …`.
      // The binding's own parent is the destructuring property, so the KEY is
      // read directly rather than by scanning the pattern — `const { alloc } =
      // require('buffer')` must not resolve to the constructor.
      if (!isBufferModuleRequire(init)) return false;
      const property = def.name.parent;
      return (
        property.type === AST_NODE_TYPES.Property &&
        !property.computed &&
        property.key.type === AST_NODE_TYPES.Identifier &&
        property.key.name === 'Buffer'
      );
    }

    /**
     * Is this expression the `buffer` MODULE object (or the global namespace)?
     *
     * `const buffer = require('node:buffer'); new buffer.Buffer(n)` is the
     * legacy spelling that predates the `Buffer` global, and it is the shape a
     * callee-identifier test cannot see at all — the callee is a member
     * expression.
     */
    function isBufferNamespace(node: TSESTree.Node): boolean {
      if (node.type !== AST_NODE_TYPES.Identifier) return false;
      const variable = findVariable(sourceCode, node);
      if (variable === null || variable.defs.length === 0) {
        return node.name === 'global' || node.name === 'globalThis';
      }
      const def = variable.defs[0];
      if (def.type === 'ImportBinding') {
        return (
          fromBufferModule(def) &&
          def.node.type === AST_NODE_TYPES.ImportNamespaceSpecifier
        );
      }
      return (
        def.type === 'Variable' &&
        def.node.init !== null &&
        isBufferModuleRequire(def.node.init)
      );
    }

    /** The `Buffer`-constructor callee of this call, if it is one. */
    function deprecatedCallee(
      callee: TSESTree.Node,
    ): TSESTree.Identifier | TSESTree.MemberExpression | null {
      if (callee.type === AST_NODE_TYPES.Identifier) {
        return resolvesToNodeBuffer(callee) ? callee : null;
      }
      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        propertyName(callee) === 'Buffer' &&
        isBufferNamespace(callee.object)
      ) {
        return callee;
      }
      return null;
    }

    /**
     * The replacement METHOD for `new Buffer(args)`, or `null` when the
     * argument's type cannot be established.
     *
     * `Buffer.from(n)` throws `TypeError` on a number, so the old rule's
     * "anything not a numeric literal becomes `.from`" made the autofix turn
     * working (deprecated) code into a crash for the commonest shape of all —
     * `new Buffer(size)` where `size` is a variable holding a length. A fix
     * that has to guess is not applied; the report still stands.
     *
     * A `const` alias is resolved, so `const SIZE = 1024; new Buffer(SIZE)`
     * fixes to `.alloc` rather than going unfixed.
     */
    function replacementMethod(args: TSESTree.CallExpressionArgument[]): string | null {
      // `Buffer.from(value, encoding)` — two arguments is always the decode
      // form; `Buffer.alloc`'s second parameter is a FILL value, not an
      // encoding of the first.
      if (args.length !== 1) return args.length === 0 ? null : '.from';
      const argument = args[0];
      if (argument.type === AST_NODE_TYPES.SpreadElement) return null;
      if (
        argument.type === AST_NODE_TYPES.ArrayExpression ||
        argument.type === AST_NODE_TYPES.TemplateLiteral
      ) {
        return '.from';
      }
      const resolved = resolveConstant(sourceCode, argument);
      if (resolved === null) return null;
      return typeof resolved.value === 'number' ? '.alloc' : '.from';
    }

    /**
     * Rewrite the callee in place, keeping the local spelling.
     *
     * `new NodeBuffer(n)` becomes `NodeBuffer.alloc(n)` and
     * `new buffer.Buffer(n)` becomes `buffer.Buffer.alloc(n)` — both valid,
     * and neither introduces a reference to a global the file never imported.
     */
    function fixTo(
      node: TSESTree.NewExpression | TSESTree.CallExpression,
      callee: TSESTree.Node,
      method: string,
    ): TSESLint.ReportFixFunction {
      return (fixer: TSESLint.RuleFixer) => {
        const start =
          node.type === AST_NODE_TYPES.NewExpression
            ? sourceCode.getFirstToken(node)!.range[0]
            : callee.range[0];
        return fixer.replaceTextRange(
          [start, callee.range[1]],
          `${sourceCode.getText(callee)}${method}`,
        );
      };
    }

    return {
      // Catches `new Buffer(size)` / `new Buffer(arr)` / `new Buffer('str')`
      NewExpression(node) {
        const callee = deprecatedCallee(node.callee);
        if (callee === null) return;
        const method = replacementMethod(node.arguments);
        context.report({
          node,
          messageId: 'deprecatedBufferConstructor',
          ...(method === null ? {} : { fix: fixTo(node, callee, method) }),
        });
      },

      // Catches `Buffer(size)` (factory call without `new`)
      CallExpression(node) {
        const callee = deprecatedCallee(node.callee);
        if (callee === null) return;
        const method = replacementMethod(node.arguments);
        context.report({
          node,
          messageId: 'deprecatedBufferCall',
          ...(method === null ? {} : { fix: fixTo(node, callee, method) }),
        });
      },
    };
  },
});

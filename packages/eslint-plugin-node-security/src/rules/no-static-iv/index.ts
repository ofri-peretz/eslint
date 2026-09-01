/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-static-iv
 * Detects use of hardcoded or reused initialization vectors (IVs)
 * CWE-329: Not Using an Unpredictable IV with CBC Mode
 *
 * @see https://cwe.mitre.org/data/definitions/329.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  AST_NODE_TYPES,
  isModuleBinding,
  unwrapTypeSyntax,
  isTestFilePath,
  staticString,
} from '@interlace/eslint-devkit';
import { constInitializerOf, resolveConstant, resolveConstantString } from '../../utils/const-value';
import { findVariable } from '../../utils/provenance';

// `useRandomBytes` used to sit here too: an INFO message with a fix string, on
// a rule declaring `hasSuggestions: false` and calling `context.report` with no
// `suggest` array. Nothing could ever have emitted it, and the advice it
// carried ("Generate IV dynamically using crypto.randomBytes(16)") is already
// the `fix:` line of `staticIv`. Deleted rather than wired, since there is no
// report path to restore — there never was one.
type MessageIds = 'staticIv';

export interface Options {
  /** Allow static IVs in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

/**
 * Patterns that indicate a hardcoded IV
 */
const STATIC_IV_PATTERNS = [
  /^[0-9a-f]+$/i,  // Hex string
  /^[A-Za-z0-9+/]+=*$/,  // Base64
];

/** The two `crypto` factories that take an explicit IV as their third argument. */
const CIPHERIV_FACTORIES = ['createCipheriv', 'createDecipheriv'] as const;

/**
 * Constructors whose zero-filled result is routinely handed straight to a
 * cipher. `Buffer.alloc(16)` and `new Uint8Array(16)` are the same sixteen zero
 * bytes; only the spelling differs, and a corpus fixture proved the rule saw
 * one of them and not the other.
 *
 * @protocol-constant The ECMAScript integer TypedArray constructors whose
 * zero-filled buffer can be passed as an IV. This is a language surface, not a
 * vocabulary: the names are fixed by the spec and nothing in a consumer's
 * domain adds to them. Letting a consumer shorten the set would blind the rule
 * to an all-zero IV in exactly the spelling they removed.
 */
const TYPED_ARRAY_CONSTRUCTORS = new Set([
  'Uint8Array',
  'Uint8ClampedArray',
  'Int8Array',
]);

/**
 * Functions that overwrite a buffer IN PLACE with CSPRNG bytes.
 *
 * `const iv = Buffer.alloc(16); randomFillSync(iv);` is the correct
 * remediation and is byte-for-byte identical, at the allocation, to the
 * all-zero-IV bug. Only the later fill separates them, so the zero-buffer arm
 * has to look at what else the binding is used for. The inline arms
 * (`createCipheriv(algo, key, Buffer.alloc(16))`) need no such check: an
 * unnamed temporary can never be filled.
 *
 * @protocol-constant The complete CSPRNG in-place fill surface: `randomFill` and
 * `randomFillSync` from `node:crypto`, `getRandomValues` from WebCrypto. This
 * list SUPPRESSES a finding, so a consumer adding to it could mark any function
 * as a secure fill and silence the rule — the `escapeHtml = (s) => s` failure
 * mode. It is a fixed API surface and must stay closed.
 */
const RANDOM_FILL_FUNCTIONS = new Set(['randomFill', 'randomFillSync', 'getRandomValues']);

/**
 * The member being called, whether written `crypto.createCipheriv` or
 * `crypto['createCipheriv']`.
 *
 * Reading `property.name` alone missed the computed form, because a computed
 * property is a `Literal` and has no `.name`. Bracket access is ordinary in
 * code that builds the method name from a config table, and it is the first
 * thing anyone reaches for to slip past a dotted-name check.
 */
function calleeMemberName(callee: TSESTree.Node): string | null {
  if (callee.type !== AST_NODE_TYPES.MemberExpression) return null;
  if (callee.property.type === AST_NODE_TYPES.Identifier && !callee.computed) {
    return callee.property.name;
  }
  return staticString(callee.property) !== null
    ? staticString(callee.property)
    : null;
}

export const noStaticIv = createRule<RuleOptions, MessageIds>({
  name: 'no-static-iv',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-static-iv.md',
      description: 'Disallow static or hardcoded initialization vectors (IVs)',
      cwe: 'CWE-329',
      cvss: 7.5,
    },
    hasSuggestions: false,
    messages: {
      staticIv: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Static IV detected',
        cwe: 'CWE-329',
        description: 'Hardcoded IV detected. Using static IVs makes encryption deterministic, allowing attackers to detect repeated plaintexts.',
        severity: 'HIGH',
        fix: 'Generate IV dynamically using crypto.randomBytes(16)',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html#initialization-vectors',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow static IVs in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const { allowInTests = false } = options as Options;

    const filename = context.filename;
    const isTestFile = allowInTests && isTestFilePath(filename);

    /**
     * Is this call one of the IV-taking `crypto` factories?
     *
     * Two independent tests, because neither alone covers real code. The
     * spelling covers `crypto.createCipheriv` and a bare destructured import,
     * where the name at the call site IS the export name. The resolved binding
     * covers `import { createCipheriv as makeCipher }`, which spells nothing
     * recognisable — a corpus fixture written as an ordinary aliased import
     * walked straight past the spelling test. Renaming an import is not a
     * security property, so the binding decides whenever the name cannot.
     */
    function isCipherivCall(node: TSESTree.CallExpression): boolean {
      const callee = node.callee;
      const spelled = calleeMemberName(callee) ?? (callee.type === AST_NODE_TYPES.Identifier ? callee.name : null);
      if (spelled !== null && (CIPHERIV_FACTORIES as readonly string[]).includes(spelled)) return true;

      const scope = context.sourceCode.getScope(node);
      return CIPHERIV_FACTORIES.some((fn) => isModuleBinding(callee, scope, 'crypto', [fn]));
    }

    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) return;

      if (isCipherivCall(node) && node.arguments.length >= 3) {
        const ivArg = node.arguments[2];
        checkIvArgument(ivArg);
      }
    }

    /** An array literal of nothing but numbers — sixteen bytes typed out by hand. */
    function isStaticByteArray(node: TSESTree.Node): boolean {
      return (
        node.type === AST_NODE_TYPES.ArrayExpression &&
        node.elements.every(
          (el: TSESTree.Expression | TSESTree.SpreadElement | null): boolean =>
            el?.type === AST_NODE_TYPES.Literal && typeof el.value === 'number',
        )
      );
    }

    /**
     * Does anything overwrite this binding with random bytes?
     *
     * Returns true only on evidence of a fill. No evidence keeps the
     * zero-buffer finding — the alternative would let any `Buffer.alloc(16)`
     * the rule cannot fully trace pass as safe.
     *
     * Takes the resolved variable, not the identifier. It used to re-walk the
     * scope chain and guard the `null` that walk can return, but every caller
     * reaches here only after `checkIvArgument` has already resolved the same
     * identifier successfully — the second lookup could not fail, and the
     * guard was unreachable.
     */
    function isRandomlyFilled(variable: TSESLint.Scope.Variable): boolean {
      return variable.references.some((ref) => {
        const parent = ref.identifier.parent;
        if (parent?.type !== AST_NODE_TYPES.CallExpression) return false;
        if (!parent.arguments.includes(ref.identifier as TSESTree.Expression)) return false;
        const callee = parent.callee;
        const name =
          calleeMemberName(callee) ??
          (callee.type === AST_NODE_TYPES.Identifier ? callee.name : null);
        return name !== null && RANDOM_FILL_FUNCTIONS.has(name);
      });
    }

    /**
     * Judge the IV, reporting at `site` — the node the reader is looking at.
     *
     * `value` and `site` differ when the IV is held in a `const`: the evidence
     * lives at the declaration, the finding belongs at the `createCipheriv`
     * call. Hoisting the IV to a constant is the *normal* way this bug is
     * written, and until this hop existed the rule was silent on it. The old
     * code even said so, in an empty `if (ivArg.type === Identifier)` block
     * whose comment read "we don't report variables as we can't always
     * determine their source" — a defect described rather than fixed. We can
     * determine the source whenever it is a single-assignment `const`, and the
     * cases where we cannot still fall through silently.
     */
    function isStaticIvValue(
      value: TSESTree.Node,
      binding: TSESLint.Scope.Variable | null,
    ): boolean {
      // A string constant reaching the IV slot: written inline, spelled with
      // backticks, or hoisted to a `const`. `resolveConstantString` collapses
      // all three, which is why this is no longer a bare `type === Literal`
      // test — a template literal with no expressions IS a string constant, and
      // a corpus fixture that only changed the quote character escaped
      // detection entirely.
      const constant = resolveConstantString(context.sourceCode, value);
      if (constant !== null) {
        const text = constant.value;
        return STATIC_IV_PATTERNS.some(p => p.test(text)) || text.length >= 8;
      }

      // `new Uint8Array([...])` — the TypeScript spelling of a typed-out IV.
      // The old code carried a comment claiming to check this while actually
      // checking `Buffer.from([...])`; the constructor form was never seen.
      if (value.type === AST_NODE_TYPES.NewExpression) {
        return (
          value.callee.type === AST_NODE_TYPES.Identifier &&
          TYPED_ARRAY_CONSTRUCTORS.has(value.callee.name) &&
          isStaticBufferSource(value.arguments[0], binding)
        );
      }

      // `Buffer.from(...)` / `Buffer.alloc(...)`
      if (
        value.type === AST_NODE_TYPES.CallExpression &&
        value.callee.type === AST_NODE_TYPES.MemberExpression &&
        value.callee.object.type === AST_NODE_TYPES.Identifier &&
        value.callee.object.name === 'Buffer' &&
        (calleeMemberName(value.callee) === 'from' || calleeMemberName(value.callee) === 'alloc')
      ) {
        return isStaticBufferSource(value.arguments[0], binding);
      }

      return false;
    }

    /**
     * Judge the bytes a buffer constructor was given.
     *
     * Shared by `Buffer.from` / `Buffer.alloc` and by `new Uint8Array`, because
     * the three take the same three kinds of argument and the vulnerability is
     * identical in each: a fixed string, a typed-out byte array, or a length,
     * which yields zeroes.
     */
    function isStaticBufferSource(
      source: TSESTree.Node | undefined,
      binding: TSESLint.Scope.Variable | null,
    ): boolean {
      // `Buffer.alloc()` / `new Uint8Array()` with no argument. There are no
      // bytes and no length to judge, so there is no evidence of a fixed IV —
      // and the call throws (or yields a zero-length IV `createCipheriv`
      // rejects) before any encryption happens.
      if (source === undefined) return false;

      // `Buffer.from('00112233…', 'hex')`, including the hex held in a named
      // constant — hoisting the string one level does not make the bytes vary.
      if (resolveConstantString(context.sourceCode, source) !== null) return true;

      if (isStaticByteArray(source)) return true;

      // A length rather than contents: `Buffer.alloc(16)` / `new Uint8Array(16)`
      // is the all-zero IV, and it is the commonest static IV in real code
      // because it reads as allocation rather than as a hardcoded constant.
      // Quiet only when the binding is demonstrably filled with random bytes
      // afterwards.
      const size = resolveConstant(context.sourceCode, source);
      if (size === null || typeof size.value !== 'number') return false;
      return binding === null || !isRandomlyFilled(binding);
    }

    /**
     * Every expression this binding can be holding when the cipher is built.
     *
     * A single-assignment `const` yields exactly one, which is what
     * `constInitializerOf` already gave us. A `let` yields its initializer plus
     * every reassignment, and the caller reports only when ALL of them are
     * static — so a `let` re-filled with `randomBytes` on any branch stays
     * quiet, while one whose every branch writes a fixed buffer does not.
     *
     * `null` means "cannot enumerate": more than one declaration, a destructured
     * target, or a write with no expression behind it. Callers must treat that
     * as no evidence, never as safe.
     */
    function ivCandidates(
      identifier: TSESTree.Identifier,
      variable: TSESLint.Scope.Variable,
    ): TSESTree.Node[] | null {
      const constInit = constInitializerOf(context.sourceCode, identifier);
      if (constInit !== null) return [constInit];

      // The variable is handed in already resolved by `checkIvArgument`, which
      // is the only caller; re-walking the scope chain here would repeat that
      // work and add a `null` arm no input could reach.
      if (variable.defs.length !== 1) return null;
      const def = variable.defs[0];
      if (def.type !== 'Variable' || def.parent.kind === 'const') return null;
      if (def.node.id.type !== AST_NODE_TYPES.Identifier) return null;

      const candidates: TSESTree.Node[] = def.node.init ? [def.node.init] : [];
      for (const ref of variable.references) {
        if (!ref.isWrite()) continue;
        if (!ref.writeExpr) return null;
        // The declaration's initializer is also a write reference; adding it
        // twice would be harmless but reads as a bug, so skip the duplicate.
        if (ref.writeExpr !== def.node.init) candidates.push(ref.writeExpr);
      }
      // Nothing to judge. An empty list would make `.every` vacuously true and
      // report a binding the rule never saw a value for.
      return candidates.length > 0 ? candidates : null;
    }

    function checkIvArgument(ivArg: TSESTree.CallExpressionArgument) {
      // `iv as unknown as Buffer` is the ordinary way a TypeScript codebase
      // hands a typed array to a Node crypto signature. The cast is type-only
      // syntax and carries no runtime meaning, so it must not hide the IV.
      const unwrapped = unwrapTypeSyntax(ivArg as TSESTree.Node);

      if (unwrapped.type === AST_NODE_TYPES.Identifier) {
        // A name with no binding in scope — a global, an implicit, a snippet
        // with no declaration — is unresolved, which is no evidence either way.
        // `ivCandidates` would reach the same `null` a line later; resolving it
        // here is what lets `isRandomlyFilled` take the variable itself.
        const binding = findVariable(context.sourceCode, unwrapped);
        if (binding === null) return;

        // `const iv = crypto.randomBytes(16)` resolves to a call this function
        // does not recognise as static, so the randomBytes case needs no
        // special-casing here — it simply produces no evidence.
        const candidates = ivCandidates(unwrapped, binding);
        if (candidates === null) return;
        if (candidates.every((c) => isStaticIvValue(unwrapTypeSyntax(c), binding))) {
          reportStaticIv(unwrapped);
        }
        return;
      }
      if (isStaticIvValue(unwrapped, null)) reportStaticIv(unwrapped);
    }

    function reportStaticIv(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'staticIv',
      });
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

export type { Options as NoStaticIvOptions };

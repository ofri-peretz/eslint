/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔒 LOCKED 2026-08-16 — read this whole block before changing anything here.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This rule's behaviour was derived from the SEMANTICS of the weakness, every
 * claim was executed in Node 24 rather than reasoned about, and the result was
 * scored head-to-head against `eslint-plugin-security`'s rule of the same name:
 *
 *   corpus (28 fixtures)   ours 100.0% F1   ·   theirs 60.0% F1
 *   real source (5 repos)  ours 13,075      ·   theirs 17,406 findings
 *
 * The contract lives in
 * `benchmarks/rule-corpus/secure-coding__detect-object-injection/SPEC.md` and is
 * pinned by three test files beside this one:
 * `global-prototype-write.test.ts`, `mass-assignment.test.ts`,
 * `dangerous-properties-option.test.ts`. All three were mutation-verified — each
 * fails when its fix is removed.
 *
 * ── WHAT LEGITIMATELY REOPENS THIS FILE ────────────────────────────────────
 *
 *   1. ECMAScript or TypeScript gains a new way to reach `Object.prototype`, or
 *      a new computed-access form. A TC39 proposal reaching Stage 4 is the bar.
 *   2. A NEW use case arrives with a REPRODUCTION: code that is genuinely
 *      vulnerable and goes unreported, or genuinely safe and gets reported,
 *      demonstrated by running it — not by reading this file and reasoning.
 *   3. A shared helper it imports changes behaviour underneath it.
 *
 * Anything else is not a reason. In particular, "this could be simpler",
 * "this looks inconsistent", or "the volume seems high" are not reasons, and
 * the volume in particular has already been measured.
 *
 * ── EDITS THAT LOOK CORRECT AND ARE NOT ────────────────────────────────────
 *
 * Each of these was actually attempted or believed on 2026-08-16, and each was
 * killed by running it. They are listed because they are the edits a competent
 * reader — human or model — will independently arrive at.
 *
 *   ✗ "A single `obj[k] = v` with `k = '__proto__'` pollutes the prototype."
 *     It does NOT. `[[Set]]` invokes the `__proto__` setter and re-parents that
 *     ONE object; `Object.prototype` is untouched. Verified, along with
 *     `Object.assign(o, JSON.parse('{"__proto__":…}'))`, object spread, and
 *     `Object.setPrototypeOf` — all safe. Global pollution needs a TWO-STEP
 *     TRAVERSAL, which is what `globalPrototypeWrite` models.
 *
 *   ✗ "Flag any member step named `prototype`."
 *     `fn.prototype.method = …` and `class C {}; C.prototype.m = …` are SAFE and
 *     appear in essentially every pre-class codebase. `prototype` counts only
 *     when reached THROUGH `constructor`. Widening this floods on a language
 *     idiom. Pinned by two valid cases in `global-prototype-write.test.ts`.
 *
 *   ✗ "Add `_.merge` / `_.set` / `_.defaultsDeep` / `dot-prop` as sinks."
 *     Measured against lodash 4.18.1: all safe. Patched in 4.17.5/.11/.21. A
 *     rule flagging them reports ALREADY-FIXED code the user cannot satisfy, and
 *     a linter cannot see which version is installed — that is `npm audit`'s
 *     job. The mechanism still lives in hand-written traversal, which the
 *     copy-loop and path-setter paths already detect.
 *
 *   ✗ "`dangerousProperties` is dead, it changed nothing when I tried it."
 *     It reaches the literal-name path and cannot reach a dynamic key, because
 *     a dynamic key has no name to compare against a list. An option is a
 *     function of (shape × setting); testing one shape proves nothing. The full
 *     matrix is pinned in `dangerous-properties-option.test.ts`.
 *
 *   ✗ "These constants should be configurable."
 *     `__proto__` / `prototype` / `constructor` are the object model's own
 *     accessors — see the `@protocol-constant` tag on the table below. Making
 *     them tunable cannot change WHAT is reported, only mislabel a critical
 *     finding, and the CWE-1321 traversal is a fact about the language rather
 *     than a vocabulary.
 *
 *   ✗ "This test expects an error on `const key = 'name'; obj[key] = value`,
 *      so the rule should report it."
 *     Two such fixtures existed and both were moved to `valid` on 2026-08-16.
 *     Their own comments admitted they pinned a false positive. A const holding
 *     a literal is a compile-time constant key; no type information is needed to
 *     see it. Do not restore them.
 *
 *   ✗ "A Symbol key should report like any other computed access."
 *     A Symbol is not a string, so it can NEVER be `'__proto__'` nor a field
 *     name a caller aims at, and `Object.keys` does not return it. Impossible,
 *     not unlikely.
 *
 *   ✗ "Suppress by resolving the key's declaration."
 *     Only with a reassignment check. `let key = 0; key = req.query.k` is
 *     numeric where it is declared and attacker-controlled where it is used;
 *     reading only the declaration silences a real finding. Both
 *     `isLocallyConstructed` and `isSymbolKey` carry that guard, and both have a
 *     CONTROL case proving it.
 *
 * ── HOW TO CHANGE IT, IF YOU HAVE A REAL REASON ────────────────────────────
 *
 *   1. Write the case in `SPEC.md` first, as TP or FP, with the reason.
 *   2. Prove the semantics with `node -e`. Six of thirteen claims in that spec
 *      came back OPPOSITE to intuition; assume yours might too.
 *   3. Add the fixture to `benchmarks/rule-corpus/secure-coding__detect-object-injection/`
 *      and re-run the duel — corpus F1 must stay 100% for both plugins' sake.
 *   4. Re-measure real-source volume. A change that fixes one shape and adds a
 *      thousand findings is not an improvement.
 *   5. Add a lock test and verify it FAILS with your change reverted.
 *   6. Move this date forward and say what changed.
 *
 * A QUIET probe proves nothing without a positive control. If you conclude a
 * shape is safe, first prove the rule REPORTS on it with the sink present.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ESLint Rule: detect-object-injection
 *
 * Two distinct weaknesses, deliberately carrying two messageIds and two CWEs:
 *   `globalPrototypeWrite`  CWE-1321  a write THROUGH `__proto__` or
 *                                     `constructor.prototype` — lands on
 *                                     Object.prototype, every object inherits it
 *   `massAssignment`        CWE-915   every caller key copied onto a target —
 *                                     the caller picks the field (`isAdmin`)
 *   `objectInjection`       CWE-915   an attacker-keyed computed read or write
 *
 * Reporting one under the other's CWE sends the reader to the wrong
 * remediation, and no F1 number notices.
 *
 * Type-Aware Enhancement:
 * This rule uses TypeScript type information when available to reduce false
 * positives. If a property key is constrained to a union of string literals
 * (e.g. 'name' | 'email'), the access is considered safe because the values are
 * statically known at compile time.
 *
 * @see https://portswigger.net/web-security/prototype-pollution
 * @see https://cwe.mitre.org/data/definitions/1321.html
 * @see https://cwe.mitre.org/data/definitions/915.html
 */
import { AST_NODE_TYPES, TSESLint, TSESTree, staticString } from '@interlace/eslint-devkit';
import { formatLLMMessage, isStaticExpression, MessageIcons } from '@interlace/eslint-devkit';
import { createRule, createModuleEvidence } from '@interlace/eslint-devkit';
import { resolvedReference } from '../../utils/resolve-reference';

/**
 * Whether this file loads an AST-manipulation library.
 *
 * Through the devkit probe, not a scan of `Program.body` for
 * `ImportDeclaration`. This is a *suppression* gate, so missing a spelling
 * fails in the false-positive direction: a jscodeshift codemod written
 * `const j = require('jscodeshift')` was not recognised as a codemod, and every
 * `node[name]` traversal in it reported CWE-1321. Measured: the ESM spelling of
 * the identical file was silent.
 */
const fileUsesAstTooling = createModuleEvidence({
  packages: [
    '@babel/types',
    '@babel/traverse',
    'recast',
    'jscodeshift',
    'eslint',
    'estree-walker',
    'ast-types',
    'esrap',
    'unist-util-visit',
  ],
  scopes: ['@typescript-eslint'],
});

type MessageIds =
  | 'objectInjection'
  | 'globalPrototypeWrite'
  | 'massAssignment';

/**
 * `additionalMethods` and `strategy` used to be declared here and in
 * `meta.schema`. Neither was ever read by `create()`. `strategy` selected
 * between the `strategyValidate`/`strategyWhitelist`/`strategyFreeze`
 * suggestions, which were themselves never reported and have been removed —
 * so it chose between three things that did not exist.
 */
export interface Options {
  /** Allow bracket notation with literal strings. Default: false (stricter) */
  allowLiterals?: boolean;

  /**
   * Property NAMES treated as dangerous where the name is literally present.
   * Default: `['__proto__', 'prototype', 'constructor']`.
   *
   * Scope, precisely — it was documented as governing every finding and does
   * not:
   *   `obj['__proto__'] = v`  literal name   -> this option decides
   *   `obj[k] = v`            dynamic key    -> no name to compare; unaffected
   *   `cfg[req.query.k]`      dynamic read   -> unaffected
   *   `o.constructor.prototype.p = 1`        -> unaffected; CWE-1321 traversal
   *                                             is a language fact, not a vocabulary
   */
  dangerousProperties?: string[];
}

type RuleOptions = [Options?];

/**
 * The ECMAScript typed-array constructors.
 *
 * Used to prove that `buf[i]` indexes a fixed-width numeric buffer, which has
 * no prototype chain to pollute.
 *
 * @protocol-constant This is the TypedArray constructor list from the
 * ECMAScript specification (Table "The TypedArray Constructors"), not a
 * vocabulary — the names are fixed by the language, and a host that adds one
 * adds it to the spec, not to a consumer's domain. Letting a consumer edit it
 * would let them delete `Uint8Array` and re-assert the false positive on
 * `bytes[i]` this set exists to close, or add an ordinary class name and
 * silence the rule on every index into it.
 */
const TYPED_ARRAY_CTORS = new Set([
  'Int8Array', 'Uint8Array', 'Uint8ClampedArray',
  'Int16Array', 'Uint16Array',
  'Int32Array', 'Uint32Array',
  'Float32Array', 'Float64Array',
  'BigInt64Array', 'BigUint64Array',
]);

/**
 * Object access patterns and their security implications
 */
interface ObjectInjectionPattern {
  pattern: string;
  dangerous: boolean;
  vulnerability: 'prototype-pollution' | 'property-injection' | 'method-injection';
  safeAlternative: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Message metadata for the three property names prototype pollution travels
 * through. This table does NOT decide whether to report — it only selects the
 * risk level and the `vulnerability` / `safeAlternative` wording of a finding
 * already made.
 *
 * It used to add "that decision is the `dangerousProperties` option", which was
 * false: that option reaches only the literal-name path, and cannot reach the
 * dynamic-key or read paths at all, because a dynamic key has no name to compare
 * against a list. Measured as a (shape x setting) matrix — see
 * dangerous-properties-option.test.ts. The claim survived because every test
 * exercised one shape at a time.
 *
 * @protocol-constant `__proto__`, `prototype` and `constructor` are the
 * ECMAScript object model's own prototype-chain accessors, not words a domain
 * chooses; there is no fourth. A consumer who could edit this table could not
 * change what is reported, only relabel a critical prototype-pollution finding
 * as low risk, or attach the wrong remediation to it — which is worse than the
 * finding they were trying to tune, and `dangerousProperties` is already the
 * supported knob for the report itself.
 */
const OBJECT_INJECTION_PATTERNS: ObjectInjectionPattern[] = [
  {
    pattern: '__proto__',
    dangerous: true,
    vulnerability: 'prototype-pollution',
    safeAlternative: 'Object.create(null) or Map',
    riskLevel: 'critical'
  },
  {
    pattern: 'prototype',
    dangerous: true,
    vulnerability: 'prototype-pollution',
    safeAlternative: 'Avoid prototype manipulation',
    riskLevel: 'high'
  },
  {
    pattern: 'constructor',
    dangerous: true,
    vulnerability: 'method-injection',
    safeAlternative: 'Validate property names against whitelist',
    riskLevel: 'medium'
  }
];

export const detectObjectInjection = createRule<RuleOptions, MessageIds>({
  name: 'detect-object-injection',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/detect-object-injection.md',
      description: 'Detects variable[key] as a left- or right-hand assignment operand',
      cwe: 'CWE-915',
      confidence: 'low',
    },
    messages: {
      // 🎯 Token optimization: 37% reduction (54→34 tokens) - removes verbose current/fix/doc labels
      objectInjection: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Object injection',
        cwe: 'CWE-915',
        description: 'Object injection/Prototype pollution (incl. model/tool outputs)',
        severity: '{{riskLevel}}',
        // §C2.4 — the sentence that lets a reader CLOSE a finding instead of
        // "fixing" correct code. This rule reports what it could not prove safe;
        // only the reader knows whether the key's provenance is a route table or
        // a request body.
        fix: '{{safeAlternative}} — Not a finding when the key is a numeric index, a module constant, or guarded by Object.hasOwn / an allowlist',
        documentationLink: 'https://portswigger.net/web-security/prototype-pollution',
      }),
      /**
       * Its own message, and its own CWE.
       *
       * `objectInjection` above declares CWE-915 — *Improperly Controlled
       * Modification of Dynamically-Determined Object Attributes* — which is the
       * mass-assignment weakness: an attacker picks which field of ONE object
       * gets written. Writing through `__proto__` or `constructor.prototype` is
       * CWE-1321, a different weakness with a different blast radius: the
       * property lands on `Object.prototype` and every object in the process
       * inherits it.
       *
       * Reporting one under the other's CWE is wrong output that no F1 number
       * notices, and it sends the reader to the wrong remediation — freezing a
       * lookup table does nothing about a polluting merge.
       */
      /**
       * CWE-915 proper: the attacker chooses WHICH FIELD of one object is
       * written, not what every object inherits. Separate from
       * `globalPrototypeWrite` because the remediation differs — an allowlist of
       * assignable fields, not a guarded traversal.
       */
      massAssignment: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Mass assignment',
        cwe: 'CWE-915',
        description:
          'Every key of an untrusted object is copied onto this target, so the caller chooses which field is written — including one they should not control, such as isAdmin',
        severity: 'HIGH',
        fix: 'Copy an explicit allowlist of assignable fields instead of the caller\'s keys — Not a finding when the iterated object is module-built, or the body checks each key against an allowlist',
        documentationLink: 'https://cwe.mitre.org/data/definitions/915.html',
      }),
      globalPrototypeWrite: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Global prototype pollution',
        cwe: 'CWE-1321',
        description:
          'Assignment writes THROUGH {{step}}, so the property lands on Object.prototype and every object in the process inherits it',
        severity: 'CRITICAL',
        fix: 'Guard with Object.hasOwn, or build the target with Object.create(null) / a Map — Not a finding when the path is fixed at build time, or __proto__ / constructor / prototype are rejected first',
        documentationLink: 'https://portswigger.net/web-security/prototype-pollution',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowLiterals: {
            type: 'boolean',
            default: false,
            description: 'Allow bracket notation with literal strings'
          },
          dangerousProperties: {
            type: 'array',
            items: { type: 'string' },
            default: ['__proto__', 'prototype', 'constructor'],
            description:
              'Property NAMES treated as dangerous where the name is visible in the source — ' +
              "`obj['__proto__'] = v`. It cannot apply to a dynamic key (`obj[k] = v`), because " +
              'there is no name to compare, and it does not gate the CWE-1321 traversal check, ' +
              'which is a fact about the language rather than a vocabulary. Set it to [] to stop ' +
              'reporting literal dangerous-property writes.'
          },
        },
        additionalProperties: false,
      },
    ],
  },
  // §B1 — the rule skips test files itself, not because a harness excluded
  // them. A consumer's own config decides what gets linted, and an assertion
  // like `expect(() => obj[key]).toThrow()` is noise it can never act on.
  skipTestFiles: true,
  defaultOptions: [
    {
      allowLiterals: false,
      dangerousProperties: ['__proto__', 'prototype', 'constructor'],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      // `allowLiterals` is accepted for backward-compatible schema/options
      // parity (see comment near `isTypedUnionAccess` usage below) but no
      // longer changes runtime behavior, so it is intentionally unused here.
      allowLiterals: _allowLiterals = false,
      dangerousProperties = ['__proto__', 'prototype', 'constructor'],
    }: Options = options;

    // Track MemberExpressions that are part of AssignmentExpressions to avoid double-reporting
    const handledMemberExpressions = new WeakSet<TSESTree.MemberExpression>();
    /**
     * `for...in` loops whose source and shape qualify as a prototype-polluting copy loop,
     * currently open in the traversal — innermost last.
     *
     * ForInStatement is visited before its body, so the loop is armed by the time the
     * body's assignments arrive and the copy-loop check claims each one first; the generic
     * handler then steps aside. Without that hand-off the same `target[key] = source[key]`
     * reports twice — one defect, two findings, precisely the over-reporting we criticise
     * in competitors.
     */
    const openCopyLoops: { keyName: string; reported: boolean }[] = [];
    /** The `for...in` nodes that actually armed, so `:exit` pops exactly what it pushed. */
    const armedLoops = new WeakSet<TSESTree.ForInStatement>();

    // ── AST-walker / codemod context detection (closes the audit FP
    // surfaced by `npm run ilb:stress-test`). When the file imports any
    // AST library (`@babel/types`, `recast`, `jscodeshift`, `eslint`,
    // `estree-walker`, `unist-util-visit`), `node[name]`-style access is
    // tree traversal, not user-input indexing. The same helper landed
    // for `no-insecure-comparison` in audit iter-2; this is the port to
    // `detect-object-injection`. See benchmarks/AUDIT_PATTERNS.md §2.1.
    const sourceCode = context.sourceCode;
    const isInCodemodContext = (() => {
      const filename = context.filename;
      if (/\/codemod[s]?\//i.test(filename)) return true;
      if (/codemod\.[mc]?[jt]sx?$/i.test(filename)) return true;
      return fileUsesAstTooling(sourceCode.ast);
    })();

    // The test-file skip that used to live here is gone. It is now `skipTestFiles`
    // on the rule definition, which short-circuits `create()` before any visitor
    // runs — so this rule cannot be reached in a test file at all, and the guard
    // here was dead code that coverage caught.
    //
    // It was also wrong in the way BENCHMARK-CRITERIA warns about: `/\/test\//`
    // matches anywhere in an absolute path, so a checkout under `~/test/proj`
    // silenced the rule for the whole repository.

    /**
     * Check if a node is a literal string (potentially safe)
     */
    const isLiteralString = (node: TSESTree.Node): boolean => {
      return staticString(node) !== null;
    };

    /**
     * Check if the property key has been validated before use.
     * 
     * Detects patterns like:
     * - if (ARRAY.includes(key)) { obj[key] = value; }
     * - if (Object.prototype.hasOwnProperty.call(obj, key)) { return obj[key]; }
     * - if (Object.hasOwn(obj, key)) { return obj[key]; }
     * 
     * @param propertyNode - The property node (key in obj[key])
     * @param node - The current node being checked
     * @returns true if the key has been validated, false otherwise
     */
    const hasPrecedingValidation = (propertyNode: TSESTree.Node, node: TSESTree.Node): boolean => {
      // Only check for identifier keys (obj[key] where key is a variable)
      if (propertyNode.type !== AST_NODE_TYPES.Identifier) {
        return false;
      }
      const keyName = propertyNode.name;

      // AST-based validation detection (faster than getText + regex)
      const isIncludesCall = (testNode: TSESTree.Node): boolean => {
        // Pattern: ARRAY.includes(keyName)
        return testNode.type === AST_NODE_TYPES.CallExpression &&
            testNode.callee.type === AST_NODE_TYPES.MemberExpression &&
            testNode.callee.property.type === AST_NODE_TYPES.Identifier &&
            testNode.callee.property.name === 'includes' &&
            testNode.arguments.length > 0 &&
            testNode.arguments[0].type === AST_NODE_TYPES.Identifier &&
            testNode.arguments[0].name === keyName;
        // Negation is unwrapped once, for every validation form, in
        // `hasValidation` below — see the comment there.
      };

      const isHasOwnPropertyCall = (testNode: TSESTree.Node): boolean => {
        // Pattern: Object.prototype.hasOwnProperty.call(obj, key) OR obj.hasOwnProperty(key) OR Object.hasOwn(obj, key)
        if (testNode.type !== AST_NODE_TYPES.CallExpression) return false;
        const callee = testNode.callee;
        const args = testNode.arguments;
        
        // Object.prototype.hasOwnProperty.call(obj, key)
        if (callee.type === AST_NODE_TYPES.MemberExpression &&
            callee.property.type === AST_NODE_TYPES.Identifier &&
            callee.property.name === 'call' &&
            args.length >= 2 &&
            args[1].type === AST_NODE_TYPES.Identifier &&
            args[1].name === keyName) {
          return true;
        }
        
        // obj.hasOwnProperty(key) OR Object.hasOwn(obj, key)
        if (callee.type === AST_NODE_TYPES.MemberExpression &&
            callee.property.type === AST_NODE_TYPES.Identifier &&
            (callee.property.name === 'hasOwnProperty' || callee.property.name === 'hasOwn')) {
          const keyArg = callee.property.name === 'hasOwn' ? args[1] : args[0];
          if (keyArg?.type === AST_NODE_TYPES.Identifier && keyArg.name === keyName) {
            return true;
          }
        }
        return false;
      };

      const isInOperator = (testNode: TSESTree.Node): boolean => {
        // Pattern: key in obj
        return testNode.type === AST_NODE_TYPES.BinaryExpression &&
               testNode.operator === 'in' &&
               testNode.left.type === AST_NODE_TYPES.Identifier &&
               testNode.left.name === keyName;
      };

      /**
       * Negation is unwrapped for EVERY validation form, not just `includes`.
       *
       * The guard-clause spelling is the dominant one in modern code —
       * `if (!Object.hasOwn(record, column)) { return null; }` — and it was the
       * only one the rule could not see, because the `!` unwrap lived inside
       * `isIncludesCall`. So `ALLOWED.includes(k)` was recognised negated and
       * un-negated, while `Object.hasOwn(o, k)` and `k in o` were recognised
       * only un-negated. That is an accident of where the unwrap was written,
       * not a judgement about which guards are trustworthy: `!guard() → return`
       * excludes exactly the keys `guard() → proceed` admits.
       */
      const hasValidation = (testNode: TSESTree.Node): boolean => {
        if (testNode.type === AST_NODE_TYPES.UnaryExpression && testNode.operator === '!') {
          return hasValidation(testNode.argument);
        }
        return isIncludesCall(testNode) || isHasOwnPropertyCall(testNode) || isInOperator(testNode);
      };

      const hasEarlyExit = (consequent: TSESTree.Statement): boolean => {
        // Check if block contains throw or return
        if (consequent.type === AST_NODE_TYPES.BlockStatement) {
          return consequent.body.some(stmt => 
            stmt.type === AST_NODE_TYPES.ThrowStatement ||
            stmt.type === AST_NODE_TYPES.ReturnStatement
          );
        }
        return consequent.type === AST_NODE_TYPES.ThrowStatement ||
               consequent.type === AST_NODE_TYPES.ReturnStatement;
      };

      // Walk up to find enclosing IfStatement with validation
      let current: TSESTree.Node | undefined = node.parent;
      let foundFunctionBody = false;
      
      while (current && !foundFunctionBody) {
        // Check if we're inside an if-block with validation in the condition
        if (current.type === AST_NODE_TYPES.IfStatement) {
          if (hasValidation(current.test)) {
            return true;
          }
        }
        
        // Check for function body - look for preceding sibling if-statements with early exit
        if (current.type === AST_NODE_TYPES.BlockStatement && current.parent && (
            current.parent.type === AST_NODE_TYPES.FunctionDeclaration ||
            current.parent.type === AST_NODE_TYPES.FunctionExpression ||
            current.parent.type === AST_NODE_TYPES.ArrowFunctionExpression)) {
          
          foundFunctionBody = true;
          const blockBody = current.body;
          const nodeIndex = blockBody.findIndex((stmt: TSESTree.Statement) => {
            let check: TSESTree.Node | undefined = node;
            while (check) {
              if (check === stmt) return true;
              check = check.parent;
            }
            return false;
          });
          
          // Look at preceding statements for validation patterns with early exit
          for (let i = 0; i < nodeIndex; i++) {
            const stmt = blockBody[i];
            if (stmt.type === AST_NODE_TYPES.IfStatement &&
                hasValidation(stmt.test) &&
                hasEarlyExit(stmt.consequent)) {
              return true;
            }
          }
        }
        
        current = current.parent;
      }
      
      return false;
    };
    /**
     * True when a literal operand of a `+` pins one end of the key to text no
     * dangerous name has.
     *
     * `obj['node' + i]` always *begins* with `node`; `array[offset + 1]` always
     * *ends* with `1`. Neither can equal `__proto__`, `prototype` or
     * `constructor` whatever the other operand holds — even under string
     * concatenation, which is the case that makes `+` unprovable in general.
     * `offset + 1` is the dominant real-world index form once the offset is a
     * function parameter, where nothing about the declaration proves numeric.
     *
     * Scoped to `dangerousProperties`, so narrowing that option correctly
     * narrows what counts as disqualifying.
     */
    const hasDisqualifyingLiteralAffix = (node: TSESTree.Node): boolean => {
      if (
        node.type !== AST_NODE_TYPES.BinaryExpression ||
        (node as TSESTree.BinaryExpression).operator !== '+'
      ) {
        return false;
      }
      const bin = node as TSESTree.BinaryExpression;
      const literalText = (n: TSESTree.Node): string | null => {
        if (n.type !== AST_NODE_TYPES.Literal) return null;
        const v = (n as TSESTree.Literal).value;
        if (typeof v !== 'string' && typeof v !== 'number') return null;
        const s = String(v);
        return s.length > 0 ? s : null;
      };

      const prefix = literalText(bin.left as TSESTree.Node);
      if (prefix !== null && !dangerousProperties.some((d) => d.startsWith(prefix))) {
        return true;
      }
      const suffix = literalText(bin.right as TSESTree.Node);
      if (suffix !== null && !dangerousProperties.some((d) => d.endsWith(suffix))) {
        return true;
      }
      return false;
    };

    /**
     * A `+` chain with a provably-numeric operand somewhere inside it.
     *
     * `samples[frameStart + frame * stride + channel]` is ordinary index
     * arithmetic, but `+` is not provably numeric unless BOTH ends are, and
     * `frameStart` is a bare parameter. The *concatenation* argument settles it
     * anyway: the result must contain the numeric operand's rendering as a
     * contiguous substring, and every `String(number)` — including `NaN`,
     * `Infinity`, `-0` and `1e+21` — contains at least one of `[0-9NI]`. None of
     * `__proto__`, `prototype` or `constructor` contains any of those, so the
     * sum cannot equal one of them whatever the other operands hold.
     *
     * Scoped to the CONFIGURED `dangerousProperties`, because a user who adds
     * `slot0` to the list breaks the premise and must keep the finding.
     */
    const NUMERIC_RENDERING_CHARS = /[0-9NI]/;
    const hasNumericOperandInConcatenation = (node: TSESTree.Node): boolean => {
      if (
        node.type !== AST_NODE_TYPES.BinaryExpression ||
        (node as TSESTree.BinaryExpression).operator !== '+' ||
        dangerousProperties.some((name) => NUMERIC_RENDERING_CHARS.test(name))
      ) {
        return false;
      }
      const anyNumericOperand = (operand: TSESTree.Node): boolean => {
        if (
          operand.type === AST_NODE_TYPES.BinaryExpression &&
          (operand as TSESTree.BinaryExpression).operator === '+'
        ) {
          const chain = operand as TSESTree.BinaryExpression;
          return anyNumericOperand(chain.left as TSESTree.Node) || anyNumericOperand(chain.right);
        }
        return isNumericKey(operand);
      };
      const bin = node as TSESTree.BinaryExpression;
      return anyNumericOperand(bin.left as TSESTree.Node) || anyNumericOperand(bin.right);
    };

    /**
     * Does this identifier resolve to a declaration whose initialiser we can SEE
     * and which is provably not build-time constant?
     *
     * The two name-shaped suppressions below are a guess about provenance made
     * from a spelling. When the binding's initialiser is visible, the guess is
     * unnecessary and it is wrong: `const eventType = req.body.type` and
     * `const FLAG_NAME = req.body.flag` are attacker-chosen keys whose names
     * happen to match a convention. Evidence beats the convention wherever
     * evidence exists.
     *
     * Deliberately narrow. A parameter, an import or an ambient binding has no
     * visible initialiser, so the suppressions still apply there and the
     * false positives they were added for (NestJS decorator metadata,
     * `errorHttpStatusCode`) stay closed.
     */
    const hasVisibleNonConstantInitialiser = (node: TSESTree.Identifier): boolean => {
      const scope = sourceCode.getScope(node);
      const variable = resolvedReference(scope, node);
      if (!variable || variable.defs.length !== 1) {
        return false;
      }
      const def = variable.defs[0];
      if (def.type !== 'Variable') {
        return false;
      }
      const init = (def.node as TSESTree.VariableDeclarator).init;
      if (!init) {
        return false;
      }
      return !isStaticExpression({ node: init, scope: sourceCode.getScope(init) });
    };

    /**
     * The identifier a member chain is rooted at — `req` for `req.body.name`.
     */
    const chainRoot = (node: TSESTree.Node): TSESTree.Identifier | null => {
      let cur = node;
      while (cur.type === AST_NODE_TYPES.MemberExpression) cur = cur.object;
      return cur.type === AST_NODE_TYPES.Identifier ? cur : null;
    };

    /**
     * Is this binding something THIS FILE builds, rather than something opaque
     * handed to it?
     *
     * `const req = { params: { id: '1' } }` is a fixture, a default, a test
     * double — not an inbound request, whatever it is spelled. Without this the
     * rule reports a compile-time constant as attacker-controlled, which is the
     * measured false positive E7 in the spec and the same one `no-sql-injection`
     * shipped: a root the file CONSTRUCTS cannot carry a caller's data.
     *
     * A root whose initialiser this file cannot see (a parameter, an import, a
     * call result) stays untrusted — absence of evidence is not evidence of
     * safety, and that asymmetry is deliberate.
     */
    const isLocallyConstructed = (id: TSESTree.Identifier): boolean => {
      const variable = resolvedReference(sourceCode.getScope(id), id);
      if (!variable || variable.defs.length !== 1) return false;
      const def = variable.defs[0];
      if (def.type !== 'Variable') return false;
      // A REASSIGNED binding no longer holds what it was declared with, and
      // reading only the declaration turns scope resolution into an escape
      // hatch. `let key = 0; key = req.query.k; obj[key] = value` is numeric at
      // the declaration and attacker-controlled by the time the access runs —
      // this suppression returned true for it and silenced a real finding until
      // the fixture written for exactly that trap caught it.
      // The initialiser is itself one write, so more than one means reassignment.
      if (variable.references.filter((ref) => ref.isWrite()).length > 1) return false;
      const init = (def.node as TSESTree.VariableDeclarator).init;
      if (!init) return false;
      return (
        init.type === AST_NODE_TYPES.ObjectExpression ||
        init.type === AST_NODE_TYPES.ArrayExpression ||
        isStaticExpression({ node: init, scope: sourceCode.getScope(init) })
      );
    };

    /**
     * Does this expression carry caller-supplied data?
     *
     * Exact membership against request roots, never a substring — `requestId`
     * and `prerequisites` are not requests. Then disqualified by
     * `isLocallyConstructed`, so the SPELLING alone never decides.
     */
    const REQUEST_ROOTS = new Set(['req', 'request', 'ctx', 'context', 'event']);
    const isUntrustedExpression = (node: TSESTree.Node): boolean => {
      const root = chainRoot(node);
      if (root === null) return false;
      if (!REQUEST_ROOTS.has(root.name)) return false;
      return !isLocallyConstructed(root);
    };

    /**
     * Check if property access is potentially dangerous
     */
    /**
     * Is this key provably a SYMBOL?
     *
     * A Symbol is not a string and can never be `'__proto__'`, `'constructor'`
     * or any field name a caller could aim at, so a Symbol-keyed access cannot
     * be this weakness — structurally, not probably. `Object.keys` does not even
     * return them.
     *
     * Measured on axios: `socket[kAxiosCurrentReq] = null` and
     * `obj[Symbol.iterator]` both reported. The well-known-Symbol protocol
     * (`Symbol.iterator`, `Symbol.asyncIterator`, `Symbol.toStringTag`) and
     * module-private Symbol keys are ordinary library plumbing, and they were a
     * visible share of our real-source volume.
     */
    const isSymbolKey = (node: TSESTree.Node): boolean => {
      // `obj[Symbol.iterator]` — a member of the Symbol global.
      if (
        node.type === AST_NODE_TYPES.MemberExpression &&
        node.object.type === AST_NODE_TYPES.Identifier &&
        node.object.name === 'Symbol'
      ) {
        return true;
      }
      // `obj[kTag]` where `const kTag = Symbol('tag')` / `Symbol.for('tag')`.
      if (node.type !== AST_NODE_TYPES.Identifier) return false;
      const variable = resolvedReference(sourceCode.getScope(node), node);
      if (!variable || variable.defs.length !== 1) return false;
      const def = variable.defs[0];
      if (def.type !== 'Variable') return false;
      // Reassignment disqualifies, same as isLocallyConstructed — a binding that
      // held a Symbol at declaration may hold a string by the time it is used.
      if (variable.references.filter((ref) => ref.isWrite()).length > 1) return false;
      const init = (def.node as TSESTree.VariableDeclarator).init;
      if (init?.type !== AST_NODE_TYPES.CallExpression) return false;
      const callee = init.callee;
      return (
        (callee.type === AST_NODE_TYPES.Identifier && callee.name === 'Symbol') ||
        (callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          callee.object.name === 'Symbol')
      );
    };

    /**
     * Is this key fixed by the MODULE GRAPH rather than chosen by a caller?
     *
     * Both weaknesses this rule reports require the attacker to pick the
     * property — `__proto__` for CWE-1321, `isAdmin` for CWE-915. A binding that
     * comes from an `import` is decided when the module loads, by whoever wrote
     * the import statement. An attacker who can change that does not need
     * prototype pollution.
     *
     * This closes an inconsistency rather than adding an exception: the rule
     * already trusts module constants through `isStaticExpression`, and an
     * import is the same claim across a file boundary.
     *
     * It also fixes the shape that made `isSymbolKey` miss its main case. A
     * symbol key lives in a shared `symbols.js` in every codebase that uses one,
     * so `isSymbolKey` — which needs to SEE the `Symbol()` call — resolved the
     * rare in-file spelling and gave up on the normal one. Measured: fastify's
     * `this[pluginUtils.kRegisteredPlugins]` and mongoose's
     * `modelOrConn[modelSymbol]` both reported.
     *
     * The root is what matters, so `pluginUtils.kRegisteredPlugins` resolves
     * through the member chain to the imported `pluginUtils`.
     */
    const isImportedBinding = (node: TSESTree.Node): boolean => {
      const root = chainRoot(node);
      if (root === null) return false;
      const variable = resolvedReference(sourceCode.getScope(root), root);
      if (!variable || variable.defs.length !== 1) return false;
      // Reassignment disqualifies, exactly as in `isSymbolKey` and
      // `isLocallyConstructed`. `import { k } from './x'` cannot be written to,
      // but reading only the def type would let a shadowing binding through.
      const def = variable.defs[0];
      if (def.type === 'ImportBinding') {
        // An import binding cannot be written to at all, so no write check.
        return true;
      }
      // CommonJS. `const pluginUtils = require('./pluginUtils')` is a Variable
      // def, not an ImportBinding — and BOTH sites this predicate was written
      // for are CJS. The ESM-only first version passed its own ESM tests and
      // changed nothing at fastify.js:255 or mongoose/aggregate.js:59, which is
      // the whole reason the fix is re-measured against the real file rather
      // than a reduction of it.
      if (def.type !== 'Variable') return false;
      // A reassigned binding no longer holds the module it was declared with.
      // The initialiser is one write, so more than one means reassignment.
      if (variable.references.filter((ref) => ref.isWrite()).length > 1) return false;
      const init = (def.node as TSESTree.VariableDeclarator).init;
      return (
        init?.type === AST_NODE_TYPES.CallExpression &&
        init.callee.type === AST_NODE_TYPES.Identifier &&
        init.callee.name === 'require'
      );
    };

    const isDangerousPropertyAccess = (propertyNode: TSESTree.Node): boolean => {
      // SAFE: a Symbol can never be the string '__proto__', nor a field name a
      // caller can aim at. Not a heuristic — a fact about the type.
      if (isSymbolKey(propertyNode)) return false;
      // SAFE: the key is fixed by the module graph, not chosen by a caller.
      if (isImportedBinding(propertyNode)) return false;
      // SAFE: the key is read out of an object this file BUILDS.
      // `const req = { params: { id: '1' } }; table[req.params.id]` is a fixture
      // or a default, not an inbound request — reporting it is asserting a
      // caller exists where the initialiser is right there. Evidence beats the
      // spelling in both directions: a `req` the file constructs is clean, and a
      // root the file cannot see stays untrusted.
      {
        const root = chainRoot(propertyNode);
        if (root !== null && isLocallyConstructed(root)) return false;
      }
      // SAFE: the key is provably numeric, is namespaced behind a literal
      // prefix, or is a concatenation containing a number. All three are facts
      // about the expression's shape, not its naming — rename every identifier
      // and the answer is unchanged.
      if (
        isNumericKey(propertyNode) ||
        hasDisqualifyingLiteralAffix(propertyNode) ||
        hasNumericOperandInConcatenation(propertyNode)
      ) {
        return false;
      }

      // NOTE: an allowlist of index-looking *names* (i, j, k, index, idx, n,
      // len) used to sit here. It was unsound in both directions — it cleared
      // `function put(o, k) { o[k] = 1 }`, where `k` is an untrusted parameter
      // that merely looks like a counter, and it missed every real index not
      // on the list (`offset`, `lastIndex`, `stride`). `isNumericKey` now
      // resolves the identifier to its declaration instead, which covers the
      // genuine counters and refuses the parameters.

      // SAFE: SCREAMING_SNAKE_CASE identifiers are TypeScript module-level constants
      // (e.g. PATH_METADATA, METHOD_METADATA, PARAMTYPES_METADATA, BRANCH_EFFECT).
      // They are compile-time string/symbol values defined in the codebase, never
      // derived from user input — prototype pollution via a constant key is impossible.
      // Pattern: at least 3 chars, ALL_CAPS letters, digits, underscores only.
      //
      // Both name-shaped suppressions below are guesses about provenance drawn
      // from a spelling, and both are DEFEATED by visible evidence — see
      // `hasVisibleNonConstantInitialiser`. `metrics[eventType] = 1` with
      // `const eventType = req.body.type` used to be silent purely because the
      // name ends in `Type`, while the identical program with the key renamed
      // `eventName` reported. Quiet in the suppress direction is a missed
      // vulnerability, which is the worst place for a spelling to decide.
      if (
        propertyNode.type === AST_NODE_TYPES.Identifier &&
        !hasVisibleNonConstantInitialiser(propertyNode as TSESTree.Identifier)
      ) {
        const name = (propertyNode as TSESTree.Identifier).name;
        if (/^[A-Z][A-Z0-9_]{2,}$/.test(name)) {
          return false;
        }

        // SAFE: camelCase identifiers whose suffix implies a typed/enumerated value.
        // HTTP status codes, version numbers, type discriminants, mode flags — these
        // are never raw user input. Examples: errorHttpStatusCode, uuidVersion, reqType.
        if (
          /^[a-z]/.test(name) &&
          /(?:Code|Status|Version|Kind|Mode|Type|Stage|Level|Phase|Step|Flag|Num|Count)$/.test(name)
        ) {
          return false;
        }
      }

      // Check if it's a literal string first
      if (isLiteralString(propertyNode)) {
        const propName = String((propertyNode as TSESTree.Literal).value);
        
        // DANGEROUS: Literal strings that match dangerous properties (always flag these)
        // Check this BEFORE checking typed union access
        if (dangerousProperties.includes(propName)) {
          return true;
        }
        
      return false; // safe non-dangerous literal
      }

      // DANGEROUS: Any untyped/dynamic property access (e.g., obj[userInput])
      return true;
    };

    /**
     * Check if the object is a prototype-less object (Object.create(null))
     * or is derived from an array spread/copy pattern
     */
    const isPrototypelessObject = (objectNode: TSESTree.Node): boolean => {
      if (objectNode.type !== AST_NODE_TYPES.Identifier) {
        return false;
      }
      
      const varName = objectNode.name;
      
      // Walk up to find the variable declaration
      let current: TSESTree.Node | undefined = objectNode;
      while (current) {
        if (current.type === AST_NODE_TYPES.BlockStatement || 
            current.type === AST_NODE_TYPES.Program) {
          const statements = current.type === AST_NODE_TYPES.BlockStatement 
            ? current.body 
            : current.body;
          
          for (const stmt of statements) {
            if (stmt.type === AST_NODE_TYPES.VariableDeclaration) {
              for (const decl of stmt.declarations) {
                if (decl.id.type === AST_NODE_TYPES.Identifier && 
                    decl.id.name === varName && 
                    decl.init) {
                  // Check for Object.create(null)
                  if (decl.init.type === AST_NODE_TYPES.CallExpression &&
                      decl.init.callee.type === AST_NODE_TYPES.MemberExpression &&
                      decl.init.callee.object.type === AST_NODE_TYPES.Identifier &&
                      decl.init.callee.object.name === 'Object' &&
                      decl.init.callee.property.type === AST_NODE_TYPES.Identifier &&
                      decl.init.callee.property.name === 'create' &&
                      decl.init.arguments.length > 0 &&
                      decl.init.arguments[0].type === AST_NODE_TYPES.Literal &&
                      decl.init.arguments[0].value === null) {
                    return true;
                  }
                  
                  // Check for array spread: [...array]
                  if (decl.init.type === AST_NODE_TYPES.ArrayExpression &&
                      decl.init.elements.length > 0 &&
                      decl.init.elements[0]?.type === AST_NODE_TYPES.SpreadElement) {
                    return true;
                  }
                }
              }
            }
          }
        }
        current = current.parent;
      }
      
      return false;
    };

    /**
     * Extract property access information
     */
    const extractPropertyAccess = (node: TSESTree.AssignmentExpression | TSESTree.MemberExpression): {
      object: string;
      property: string;
      propertyNode: TSESTree.Node;
      isAssignment: boolean;
      pattern: ObjectInjectionPattern | null;
    } => {
      let object: string;
      let property: string;
      let propertyNode: TSESTree.Node;
      let isAssignment = false;

      // Note: the `node.left.type !== MemberExpression` / plain-MemberExpression
      // shapes are the only two forms ever passed in — every call site
      // (isHighRiskAssignment / isHighRiskMemberAccess and their two
      // downstream checkAssignmentExpression / checkMemberExpression callers)
      // already guards on the same discriminants before calling this
      // function, so a "neither shape matched" fallback is unreachable dead
      // code. The `if`/`else if` below is kept (rather than a non-null
      // assertion) purely for TypeScript exhaustiveness over the declared
      // union parameter type.
      if (node.type === AST_NODE_TYPES.AssignmentExpression && node.left.type === AST_NODE_TYPES.MemberExpression) {
        // Assignment: obj[key] = value
        object = sourceCode.getText(node.left.object);
        property = sourceCode.getText(node.left.property);
        propertyNode = node.left.property;
        isAssignment = true;
      } else {
        // Access: obj[key]. By contract with every call site, `node` is a
        // plain MemberExpression whenever the branch above doesn't match.
        const memberNode = node as TSESTree.MemberExpression;
        object = sourceCode.getText(memberNode.object);
        property = sourceCode.getText(memberNode.property);
        propertyNode = memberNode.property;
        isAssignment = false;
      }

      // Check if property matches dangerous patterns
      const pattern = OBJECT_INJECTION_PATTERNS.find(p =>
        new RegExp(p.pattern, 'i').test(property) ||
        dangerousProperties.includes(property.replace(/['"]/g, ''))
      ) || null;

      return { object, property, propertyNode, isAssignment, pattern };
    };

    /**
     * The static property name of one member step, dot or bracket-literal.
     *
     * `o.constructor` and `o['constructor']` are the same traversal and both
     * pollute; keying on `computed` would see only one of them.
     */
    const stepName = (m: TSESTree.MemberExpression): string | null => {
      if (!m.computed && m.property.type === AST_NODE_TYPES.Identifier) return m.property.name;
      if (
        m.computed &&
        m.property.type === AST_NODE_TYPES.Literal &&
        typeof m.property.value === 'string'
      ) {
        return m.property.value;
      }
      return null;
    };

    /**
     * Does this assignment WRITE THROUGH a prototype-reaching step, landing on
     * `Object.prototype` and affecting every object in the process?
     *
     * This is CWE-1321, and it is the shape the rule was blind to. Verified in
     * Node 24 rather than assumed, because the intuition is wrong in both
     * directions:
     *
     *   o.__proto__.p = 1              POLLUTES   (non-final __proto__)
     *   o['__proto__'].p = 1           POLLUTES   (same step, bracket spelling)
     *   o.constructor.prototype.p = 1  POLLUTES   (non-final constructor→prototype)
     *   o.__proto__ = { p: 1 }         safe       (FINAL — re-parents this object only)
     *   o.constructor = X              safe       (FINAL)
     *   fn.prototype.p = 1             safe       (a function's own prototype)
     *   class C {}; C.prototype.p = 1  safe       (ditto)
     *
     * Two consequences the rule had backwards. **A single `obj[k] = v` cannot
     * pollute** — `[[Set]]` on `__proto__` invokes the setter and re-parents that
     * one object — so the shape the rule reported hardest is the shape that
     * cannot cause this. And **the write need not be computed at all**: the
     * canonical form is a plain dot chain, which the `!computed` early return
     * below discards.
     *
     * The last two rows are why this cannot be "any step named `prototype`":
     * `fn.prototype.method = …` is ordinary prototype-based JavaScript and
     * appears in essentially every pre-class codebase. `prototype` counts only
     * when it is reached THROUGH `constructor`, which is what escapes the
     * object's own function into the shared one.
     */
    const globalPrototypeWrite = (node: TSESTree.AssignmentExpression): string | null => {
      if (node.left.type !== AST_NODE_TYPES.MemberExpression) return null;

      // Every step EXCEPT the final one — the final property is what is written
      // TO, and writing to `__proto__` re-parents one object rather than polluting.
      const steps: string[] = [];
      let cur: TSESTree.Node = node.left.object;
      while (cur.type === AST_NODE_TYPES.MemberExpression) {
        const name = stepName(cur);
        if (name === null) return null; // a dynamic step — not provably this shape
        steps.unshift(name);
        cur = cur.object;
      }

      if (steps.includes('__proto__')) return '__proto__';
      for (let i = 0; i < steps.length - 1; i++) {
        if (steps[i] === 'constructor' && steps[i + 1] === 'prototype') return 'constructor.prototype';
      }
      return null;
    };

    /**
     * Determine if this is a high-risk assignment
     */
    const isHighRiskAssignment = (node: TSESTree.AssignmentExpression): boolean => {
      if (node.left.type !== 'MemberExpression') {
        return false;
      }

      // Only check computed member access (bracket notation)
      // Dot notation (obj.name) is safe
      if (!node.left.computed) {
        return false;
      }

      // SAFE: Object.create(null) objects have no prototype to pollute
      if (isPrototypelessObject(node.left.object)) {
        return false;
      }

      // SAFE: typed-array element assignment is numeric, not a string-key injection
      if (isTypedArrayObject(node.left.object)) {
        return false;
      }

      const { propertyNode } = extractPropertyAccess(node);

      // SAFE: numeric keys can't pollute Object prototypes (typed-array
      // / numeric-array assignment is structurally safe).
      if (isNumericKey(propertyNode)) {
        return false;
      }

      // SAFE: key originates from for..in or Object.keys/entries iteration
      if (isForInOrObjectKeysKey(propertyNode)) {
        return false;
      }

      // Skip if the key has been validated (e.g., includes() or hasOwnProperty check)
      if (hasPrecedingValidation(propertyNode, node)) {
        return false;
      }

      // Check for dangerous property access in assignment
      return isDangerousPropertyAccess(propertyNode);
    };

    /**
     * Returns true if the object being indexed is the result of a Reflect.*
     * method call (e.g. Reflect.getMetadata, Reflect.ownKeys).
     * Reflect metadata objects contain known framework-managed keys; they are
     * not populated from user input and cannot be exploited for prototype
     * pollution. This closes FPs from NestJS decorator metadata access patterns:
     *   Reflect.getMetadata(PARAMTYPES_METADATA, target, key!)?.[index!]
     */
    const isReflectResultAccess = (objectNode: TSESTree.Node): boolean => {
      // Direct call: Reflect.getMetadata(...)
      if (objectNode.type === AST_NODE_TYPES.CallExpression) {
        const callee = (objectNode as TSESTree.CallExpression).callee;
        if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          (callee.object as TSESTree.Identifier).name === 'Reflect'
        ) {
          return true;
        }
      }
      // Optional chain: Reflect.getMetadata(...)?.[key]
      if (objectNode.type === AST_NODE_TYPES.ChainExpression) {
        return isReflectResultAccess(
          (objectNode as TSESTree.ChainExpression).expression,
        );
      }
      return false;
    };

    /**
     * Determine if this is a high-risk member access
     */
    const isHighRiskMemberAccess = (node: TSESTree.MemberExpression): boolean => {
      // Only check computed member access (bracket notation)
      if (!node.computed) {
        return false;
      }

      // SAFE: accessing result of Reflect.* call (framework-managed metadata)
      if (isReflectResultAccess(node.object)) {
        return false;
      }

      // SAFE: typed-array element read is numeric, not a string-key injection
      if (isTypedArrayObject(node.object)) {
        return false;
      }

      const { propertyNode } = extractPropertyAccess(node);

      // Numeric keys cannot pollute Object prototypes — typed-array and
      // numeric-array access (`arr[0]`, `arr[i]` where i is a for-loop
      // counter) is structurally safe. This eliminates the bulk of false
      // positives on numeric/buffer-heavy codebases (Three.js, webpack,
      // image/audio/geometry libraries) without weakening detection of
      // string-key prototype pollution.
      if (isNumericKey(propertyNode)) {
        return false;
      }

      // SAFE: key originates from for..in or Object.keys/entries iteration
      if (isForInOrObjectKeysKey(propertyNode)) {
        return false;
      }

      // Skip if the key has been validated (e.g., includes() or hasOwnProperty check)
      if (hasPrecedingValidation(propertyNode, node)) {
        return false;
      }

      // Check for dangerous property access
      return isDangerousPropertyAccess(propertyNode);
    };

    /**
     * Returns true if the property expression is provably a numeric key
     * (and therefore cannot trigger prototype pollution).
     *
     * Detected as numeric:
     *   - Numeric literal:        arr[0], arr[42]
     *   - Unary plus on number:   arr[+x]
     *   - Number(...) coercion:   arr[Number(x)]
     *   - parseInt/parseFloat:    arr[parseInt(x)]
     *   - Bitwise on identifier:  arr[x | 0], arr[x >>> 0]
     *   - Identifier whose declaration is the init of a `for` statement
     *     (the standard `for (let i = 0; i < n; i++)` counter pattern)
     */
    const isNumericKey = (node: TSESTree.Node): boolean => {
      if (node.type === AST_NODE_TYPES.Literal && typeof (node as TSESTree.Literal).value === 'number') {
        return true;
      }
      if (node.type === AST_NODE_TYPES.UnaryExpression) {
        const op = (node as TSESTree.UnaryExpression).operator;
        // `+x`, `-x` and `~x` all apply ToNumber to their operand.
        if (op === '+' || op === '-' || op === '~') return true;
      }
      // `i++` / `--i` evaluate to a number by ToNumeric, whatever `i` held.
      // This is the dominant real-world index form (`result[dstOffset++]`) and
      // was previously only caught when the variable happened to be named `i`.
      if (node.type === AST_NODE_TYPES.UpdateExpression) {
        return true;
      }
      if (node.type === AST_NODE_TYPES.BinaryExpression) {
        const op = (node as TSESTree.BinaryExpression).operator;
        if (op === '|' || op === '&' || op === '^' || op === '<<' || op === '>>' || op === '>>>' || op === '*' || op === '/' || op === '%' || op === '-' || op === '**') {
          return true;
        }
        // `+` only when *both* sides are themselves provably numeric —
        // otherwise it is string concatenation.
        if (op === '+') {
          const bin = node as TSESTree.BinaryExpression;
          return isNumericKey(bin.left as TSESTree.Node) && isNumericKey(bin.right as TSESTree.Node);
        }
      }
      // `cond ? 0 : 1` is numeric when both arms are.
      if (node.type === AST_NODE_TYPES.ConditionalExpression) {
        const cond = node as TSESTree.ConditionalExpression;
        return isNumericKey(cond.consequent) && isNumericKey(cond.alternate);
      }
      if (node.type === AST_NODE_TYPES.CallExpression) {
        const callee = (node as TSESTree.CallExpression).callee;
        if (callee.type === AST_NODE_TYPES.Identifier) {
          const name = (callee as TSESTree.Identifier).name;
          if (name === 'Number' || name === 'parseInt' || name === 'parseFloat') return true;
        }
        // `Math.floor(...)` and friends always return a number — the standard
        // way an index is computed (`const j = Math.floor(Math.random() * n)`).
        if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          callee.object.name === 'Math' &&
          callee.property.type === AST_NODE_TYPES.Identifier
        ) {
          return true;
        }
      }
      if (node.type === AST_NODE_TYPES.Identifier) {
        return isNumericIdentifier(node as TSESTree.Identifier);
      }
      return false;
    };

    /**
     * True when the identifier provably holds a number — decided from how the
     * variable is *defined*, not from what it is called.
     *
     * `values[valueStart + k]` is ordinary index arithmetic, but `+` between
     * two identifiers proves nothing on its own. Resolving each operand to its
     * declaration settles it: if every value the variable ever receives is a
     * provably-numeric expression, the sum is numeric and the key can never be
     * `__proto__` / `prototype` / `constructor`.
     *
     * Deliberately conservative — a parameter, a `for..of` binding, or a
     * single non-numeric assignment anywhere leaves the variable unproven and
     * the access still reports. That keeps the analysis on the safe side of
     * the FP/FN trade: it can only ever fail to clear a safe access, never
     * clear an unsafe one.
     */
    const numericVarCache = new WeakMap<object, boolean>();
    const numericVarInProgress = new WeakSet<object>();

    const isNumericIdentifier = (node: TSESTree.Identifier): boolean => {
      if (isLoopCounterIdentifier(node)) return true;

      const scope = context.sourceCode.getScope(node);
      const variable = resolvedReference(scope, node);
      if (!variable || variable.defs.length === 0) return false;

      const cached = numericVarCache.get(variable);
      if (cached !== undefined) return cached;
      // `let i = 0; i = i + 1;` refers to itself. Treat the in-flight variable
      // as numeric so the cycle terminates on its other operands rather than
      // recursing; if any of those are non-numeric the whole result is still
      // false.
      if (numericVarInProgress.has(variable)) return true;
      numericVarInProgress.add(variable);

      let result = false;
      const def = variable.defs[0];
      const declarator = def.node;
      if (
        declarator?.type === AST_NODE_TYPES.VariableDeclarator &&
        declarator.init &&
        // `for (const k of ...)` has no init and must not qualify.
        declarator.parent?.type === AST_NODE_TYPES.VariableDeclaration
      ) {
        result = isNumericKey(declarator.init);
        if (result) {
          // Every later write has to stay numeric, or the variable can hold a
          // string by the time the access runs.
          for (const ref of variable.references) {
            const written = ref.writeExpr;
            if (!written || written === declarator.init) continue;
            if (!isNumericKey(written)) {
              result = false;
              break;
            }
          }
        }
      }

      numericVarInProgress.delete(variable);
      numericVarCache.set(variable, result);
      return result;
    };

    /**
     * Returns true if the identifier is the loop variable of an enclosing
     * `for` statement, e.g. `for (let i = 0; i < n; i++) arr[i]`. The loop
     * counter is by construction numeric, so the access is safe.
     */
    const isLoopCounterIdentifier = (node: TSESTree.Identifier): boolean => {
      const scope = context.sourceCode.getScope(node);
      const variable = resolvedReference(scope, node);
      if (!variable || variable.defs.length === 0) return false;
      const def = variable.defs[0];
      // Look for `for (let i = <numeric init>; ...; ...)` shape.
      const parent = def.node?.parent as TSESTree.Node | undefined;
      const grand = parent?.parent as TSESTree.Node | undefined;
      if (
        parent?.type === AST_NODE_TYPES.VariableDeclaration &&
        grand?.type === AST_NODE_TYPES.ForStatement &&
        grand.init === parent
      ) {
        const init = (def.node as TSESTree.VariableDeclarator).init;
        if (!init) return false;
        // Initializer must itself be numeric.
        if (init.type === AST_NODE_TYPES.Literal && typeof (init as TSESTree.Literal).value === 'number') {
          return true;
        }
      }
      return false;
    };

    /**
     * Array-iteration methods whose callback receives the ELEMENT first. Exact
     * membership against a closed API surface, not a substring test.
     *
     * @protocol-constant These are the `Array.prototype` iteration methods
     * whose callback signature the ECMAScript specification fixes as
     * `(element, index, array)`; the set is a property of the language, not of
     * a consumer's codebase. Adding a name here asserts a callback signature
     * that the named method does not have, so the first parameter would be
     * read as an element when it is really an index — and removing one
     * re-asserts the false positive on `arr.forEach((el) => el[k])` that the
     * set was added to close.
     */
    const ELEMENT_FIRST_ITERATORS: ReadonlySet<string> = new Set([
      'forEach',
      'map',
      'filter',
      'find',
      'findLast',
      'some',
      'every',
      'flatMap',
    ]);

    /**
     * Is this function the callback of `Object.keys(x).forEach(...)` (or `.map`,
     * `.filter`, …), with `name` bound to its first parameter?
     *
     * `Object.keys(usage).forEach((k) => usage[k])` carries exactly the guarantee
     * the rule already grants `for (const k in usage)` and
     * `for (const k of Object.keys(usage))`: `k` is an OWN enumerable key, so the
     * access can never reach an inherited property. It is also the most common
     * object-iteration idiom in JavaScript, and it was the one spelling of the
     * three that reported — an accident of node types rather than a security
     * judgement, and on its own enough to make the rule unusable on ordinary
     * application code.
     */
    const isObjectKeysCallbackKey = (fn: TSESTree.Node, name: string): boolean => {
      if (
        fn.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
        fn.type !== AST_NODE_TYPES.FunctionExpression
      ) {
        return false;
      }
      const first = fn.params[0];
      // Either `(key) => …` or the `Object.entries` destructuring `([key, value]) => …`.
      const bindsName =
        (first?.type === AST_NODE_TYPES.Identifier && first.name === name) ||
        (first?.type === AST_NODE_TYPES.ArrayPattern &&
          first.elements[0]?.type === AST_NODE_TYPES.Identifier &&
          first.elements[0].name === name);
      if (!bindsName) return false;

      const call = fn.parent;
      if (
        call?.type !== AST_NODE_TYPES.CallExpression ||
        call.arguments[0] !== fn ||
        call.callee.type !== AST_NODE_TYPES.MemberExpression ||
        call.callee.computed ||
        call.callee.property.type !== AST_NODE_TYPES.Identifier ||
        !ELEMENT_FIRST_ITERATORS.has(call.callee.property.name)
      ) {
        return false;
      }

      const source = call.callee.object;
      return (
        source.type === AST_NODE_TYPES.CallExpression &&
        source.callee.type === AST_NODE_TYPES.MemberExpression &&
        !source.callee.computed &&
        source.callee.object.type === AST_NODE_TYPES.Identifier &&
        source.callee.object.name === 'Object' &&
        source.callee.property.type === AST_NODE_TYPES.Identifier &&
        (source.callee.property.name === 'keys' || source.callee.property.name === 'entries')
      );
    };

    /**
     * Returns true if the identifier is the iteration variable of a `for...in`
     * statement or a `for...of Object.keys()/Object.entries()` statement. Keys
     * from these loops are guaranteed to be actual property names on the object
     * (not user-controlled inputs), so `obj[key]` inside such a loop is safe
     * from prototype-pollution injection. Closes the bulk of ILB-Wild FPs on
     * utility and serialisation code.
     */
    const isForInOrObjectKeysKey = (node: TSESTree.Node): boolean => {
      if (node.type !== AST_NODE_TYPES.Identifier) return false;
      const scope = context.sourceCode.getScope(node);
      const variable = resolvedReference(scope, node);
      if (!variable || variable.defs.length === 0) return false;
      const def = variable.defs[0];
      if (def.type === 'Parameter') {
        return isObjectKeysCallbackKey(def.node as TSESTree.Node, node.name);
      }
      const varDecl = def.node?.parent as TSESTree.Node | undefined;
      const loopStmt = varDecl?.parent as TSESTree.Node | undefined;
      if (!varDecl || varDecl.type !== AST_NODE_TYPES.VariableDeclaration) return false;

      // for (const key in obj) { ... obj[key] ... }
      if (loopStmt?.type === AST_NODE_TYPES.ForInStatement && loopStmt.left === varDecl) {
        return true;
      }

      // for (const key of Object.keys(obj)) / Object.entries(obj)
      if (loopStmt?.type === AST_NODE_TYPES.ForOfStatement && loopStmt.left === varDecl) {
        const right = loopStmt.right;
        return (
          right.type === AST_NODE_TYPES.CallExpression &&
          right.callee.type === AST_NODE_TYPES.MemberExpression &&
          !right.callee.computed &&
          right.callee.object.type === AST_NODE_TYPES.Identifier &&
          right.callee.object.name === 'Object' &&
          right.callee.property.type === AST_NODE_TYPES.Identifier &&
          (right.callee.property.name === 'keys' || right.callee.property.name === 'entries')
        );
      }

      return false;
    };

    /**
     * Returns true if the object being indexed was declared as a typed array
     * (Int8Array…Float64Array, BigInt64Array, BigUint64Array). Typed-array
     * element access is numeric by construction; string-keyed prototype
     * pollution is impossible. This closes FPs on geometry, audio, image, and
     * buffer-heavy code (Three.js, WebGL, wasm adapters, etc.).
     */
    const isTypedArrayObject = (objectNode: TSESTree.Node): boolean => {
      if (objectNode.type !== AST_NODE_TYPES.Identifier) return false;
      const varName = (objectNode as TSESTree.Identifier).name;
      let scope = context.sourceCode.getScope(objectNode);
      while (scope) {
      // `Scope#set` (a Map), not `Scope#variables.find` (a linear scan).
      //
      // Resolving a name by scanning the scope's variable array is O(V) per
      // lookup, and V grows with the module. Across N candidate nodes that is
      // O(N·V) — quadratic in file length. Measured on this rule's own corpus
      // before the change: 2.6 ms at 500 lines, 2.8 ms at 2000, and 95 ms at
      // 8000 — roughly 33x the time for 4x the lines. ESLint maintains `set`
      // for exactly this lookup.
        const variable = scope.set.get(varName);
        if (variable) {
          for (const def of variable.defs) {
            const init = (def.node as TSESTree.VariableDeclarator).init;
            if (
              init?.type === AST_NODE_TYPES.NewExpression &&
              init.callee.type === AST_NODE_TYPES.Identifier &&
              TYPED_ARRAY_CTORS.has((init.callee as TSESTree.Identifier).name)
            ) {
              return true;
            }
          }
          break;
        }
        if (!scope.upper) break;
        scope = scope.upper;
      }
      return false;
    };

    /**
     * Determine risk level based on the pattern and context
     */
    // oxlint-disable-next-line consistent-function-scoping
    const determineRiskLevel = (pattern: ObjectInjectionPattern | null, isAssignment: boolean): string => {
      if (pattern?.riskLevel === 'critical' || (pattern && isAssignment)) {
        return 'CRITICAL';
      }

      if (pattern?.riskLevel === 'high' || isAssignment) {
        return 'HIGH';
      }

      return 'MEDIUM';
    };

    /**
     * Check assignment expressions for object injection
     */
    const checkAssignmentExpression = (node: TSESTree.AssignmentExpression) => {
      // BEFORE isHighRiskAssignment, which returns false for a non-computed left
      // side. The canonical pollution shape is a plain dot chain
      // (`o.constructor.prototype.p = 1`), so gating this on bracket notation is
      // what made the rule blind to it.
      const step = globalPrototypeWrite(node);
      if (step !== null) {
        // Claim the whole left-side chain first. `o['constructor']['prototype'].p = 1`
        // otherwise draws this finding AND a generic `objectInjection` from the
        // MemberExpression visitor for the inner computed steps — one defect,
        // two findings, which is the over-reporting we criticise in competitors.
        // The dot spelling never hit it, so this only shows up on the bracket form.
        for (
          let m: TSESTree.Node = node.left;
          m.type === AST_NODE_TYPES.MemberExpression;
          m = m.object
        ) {
          handledMemberExpressions.add(m);
        }
        context.report({ node, messageId: 'globalPrototypeWrite', data: { step } });
        return;
      }

      if (!isHighRiskAssignment(node)) {
        return;
      }

      // `const t = ALLOWED[x]; process.env[t] = v` — the key is provably one of the closed
      // set of literals in ALLOWED, so no attacker-chosen property is reachable.
      if (
        node.left.type === AST_NODE_TYPES.MemberExpression &&
        node.left.computed &&
        keyComesFromConstAllowlist(node.left.property, node)
      ) {
        return;
      }

      // Mark the entire left-side MemberExpression chain as handled.
      // For chained access like `a[b][c] = val`, the rule reports on the
      // AssignmentExpression (outer), then the MemberExpression visitor
      // would fire again for the INNER `a[b]` access. We walk the object
      // chain and mark every intermediate computed MemberExpression so the
      // MemberExpression visitor skips them — preventing exact duplicates.
      // isHighRiskAssignment already verified node.left.type === 'MemberExpression'
      let me = node.left as TSESTree.MemberExpression;
      handledMemberExpressions.add(me);
      // Walk into chained computed accesses: a[b][c] → also mark a[b]
      while (me.object.type === AST_NODE_TYPES.MemberExpression && me.object.computed) {
        me = me.object as TSESTree.MemberExpression;
        handledMemberExpressions.add(me);
      }

      const { object, property, isAssignment, pattern } = extractPropertyAccess(node);

      const riskLevel = determineRiskLevel(pattern, isAssignment);

      context.report({
        node,
        messageId: 'objectInjection',
        data: {
          pattern: `${object}[${property}]`,
          riskLevel,
          vulnerability: pattern?.vulnerability || 'object injection',
          safeAlternative: pattern?.safeAlternative || 'Use Map or property whitelisting',
        },});
    };

    /**
     * Check member expressions for object injection
     */
    /**
     * Resolve an identifier to the ObjectExpression of a `const` declaration that is never
     * written to after initialisation. Returns null if anything about that is not provable.
     */
    const constObjectLiteralOf = (
      name: string,
      from: TSESTree.Node,
    ): TSESTree.ObjectExpression | null => {
      for (
        let scope: ReturnType<typeof sourceCode.getScope> | null = sourceCode.getScope(from);
        scope;
        scope = scope.upper
      ) {
        const variable = scope.set.get(name);
        if (!variable) continue;
        if (variable.defs.length !== 1) return null;
        const def = variable.defs[0];
        if (def.type !== 'Variable' || def.parent?.kind !== 'const') return null;
        // A later write (`ALLOWED = something`) would break the closed-set guarantee.
        if (variable.references.some((ref) => ref.isWrite() && ref.identifier !== def.name)) {
          return null;
        }
        const init = def.node.init;
        return init?.type === AST_NODE_TYPES.ObjectExpression ? init : null;
      }
      return null;
    };

    /**
     * A computed READ off a `const` object literal cannot be prototype pollution: the shape
     * is fixed at parse time and nothing is written. `ALLOWED[req.body.setting]` and
     * `MESSAGES[locale]` are the closed-allowlist pattern that IS the documented fix for
     * this CWE — flagging it is precisely the defect we measure in competitors, where 27%
     * of eslint-plugin-security's findings are constant-key accesses that cannot pollute.
     */
    const isReadFromConstObjectLiteral = (node: TSESTree.MemberExpression): boolean =>
      node.object.type === AST_NODE_TYPES.Identifier &&
      constObjectLiteralOf(node.object.name, node) !== null;

    /**
     * The written key is an identifier whose sole initialiser is a computed read off a
     * `const` object literal whose values are all literals — so the key provably belongs to
     * a closed set, e.g. `const t = ALLOWED[x]; process.env[t] = v`.
     */
    const keyComesFromConstAllowlist = (property: TSESTree.Node, from: TSESTree.Node): boolean => {
      if (property.type !== AST_NODE_TYPES.Identifier) return false;
      for (
        let scope: ReturnType<typeof sourceCode.getScope> | null = sourceCode.getScope(from);
        scope;
        scope = scope.upper
      ) {
        const variable = scope.set.get(property.name);
        if (!variable) continue;
        if (variable.defs.length !== 1) return false;
        const def = variable.defs[0];
        if (def.type !== 'Variable' || def.parent?.kind !== 'const') return false;
        if (variable.references.some((ref) => ref.isWrite() && ref.identifier !== def.name)) {
          return false;
        }
        const init = def.node.init;
        if (
          init?.type !== AST_NODE_TYPES.MemberExpression ||
          !init.computed ||
          init.object.type !== AST_NODE_TYPES.Identifier
        ) {
          return false;
        }
        const source = constObjectLiteralOf(init.object.name, init);
        if (!source) return false;
        // Every value must be a literal, or the "closed set of known strings" claim fails.
        return source.properties.every(
          (p) =>
            p.type === AST_NODE_TYPES.Property &&
            p.value.type === AST_NODE_TYPES.Literal &&
            typeof p.value.value === 'string',
        );
      }
      return false;
    };

    /**
     * Is the value read here CALLED?
     *
     * A read cannot pollute a prototype, but a read whose result is invoked is
     * method injection — CWE-915's other arm, and a real one. The corpus fixture
     * `vulnerable/07-dynamic-handler-dispatch.js` is exactly this:
     *
     *   const handler = this.handlers[req.body.action];
     *   return handler(req.body.payload);
     *
     * `{"action":"constructor"}` resolves to the Object constructor and the next
     * line calls it. Dropping every read would have lost this, and the duel
     * caught it — recall fell 100% to 92.9% on the first attempt at this change.
     *
     * Two shapes: called immediately, or bound once and then called in the same
     * scope. Beyond one hop is L1.
     */
    const isInvokedRead = (node: TSESTree.MemberExpression): boolean => {
      const parent = node.parent as TSESTree.Node | undefined;
      if (parent === undefined) return false;

      // `handlers[k](...)`
      if (parent.type === AST_NODE_TYPES.CallExpression && parent.callee === node) {
        return true;
      }

      // `const h = handlers[k]; h(...)`
      if (
        parent.type !== AST_NODE_TYPES.VariableDeclarator ||
        parent.init !== node ||
        parent.id.type !== AST_NODE_TYPES.Identifier
      ) {
        return false;
      }
      const variable = context.sourceCode
        .getDeclaredVariables(parent as never)
        .find((candidate) => candidate.name === (parent.id as TSESTree.Identifier).name);
      return (
        variable?.references.some((reference) => {
          const referenceParent = reference.identifier.parent as TSESTree.Node | undefined;
          return (
            referenceParent?.type === AST_NODE_TYPES.CallExpression &&
            referenceParent.callee === reference.identifier
          );
        }) ?? false
      );
    };

    /**
     * Is this access the TARGET of a write, rather than a value being read?
     *
     * A member expression is a write target when it is the left side of an
     * assignment or update, the argument of `delete`, or an intermediate step in
     * a chain whose outermost link is one of those — `o[a][b] = v` writes
     * through `o[a]`, so `o[a]` is on a write path even though it is not itself
     * the assignment's left side.
     */
    const isWriteTarget = (node: TSESTree.MemberExpression): boolean => {
      let current: TSESTree.Node = node;
      let parent = current.parent as TSESTree.Node | undefined;
      while (parent !== undefined) {
        if (
          parent.type === AST_NODE_TYPES.AssignmentExpression &&
          parent.left === current
        ) {
          return true;
        }
        if (parent.type === AST_NODE_TYPES.UpdateExpression && parent.argument === current) {
          return true;
        }
        if (parent.type === AST_NODE_TYPES.UnaryExpression && parent.operator === 'delete') {
          return true;
        }
        // Keep climbing only while we are still the OBJECT of an enclosing
        // member expression; that is the `o[a]` in `o[a][b] = v`. Being the
        // computed PROPERTY (`x` in `o[x]`) is a read of `x`, not a write path.
        if (parent.type === AST_NODE_TYPES.MemberExpression && parent.object === current) {
          current = parent;
          parent = current.parent as TSESTree.Node | undefined;
          continue;
        }
        return false;
      }
      return false;
    };

    const checkMemberExpression = (node: TSESTree.MemberExpression) => {
      // A READ CANNOT POLLUTE A PROTOTYPE. Executed, not argued:
      //
      //   const o = {}, k = '__proto__';
      //   const v = o[k];            // Object.prototype unchanged
      //
      // There is no key, no object and no runtime in which evaluating `obj[k]`
      // as an expression writes anything. The probe is in the corpus at
      // POLLUTION-FACTS.md.
      //
      // Measured on 20 repositories and 3.10M lines, this rule produced 14,910
      // findings across 4,286 distinct cases — and 2,100 of those cases, 49.0%,
      // were reads. Half of everything it said was provably incapable of the
      // weakness it is named after, under a CWE-1321 message that told the
      // reader otherwise.
      //
      // The LOCK header permits exactly this reopening: "a new use case arrives
      // WITH A REPRODUCTION — code that is genuinely safe and reported,
      // demonstrated by RUNNING it."
      //
      // NOT claimed: that reading an attacker-chosen key is harmless in general.
      // `user[req.query.field]` can hand back a password hash. That is CWE-200,
      // information exposure — a different weakness needing a different message,
      // and it is tracked as a gap rather than smuggled in under this one.
      if (!isWriteTarget(node) && !isInvokedRead(node)) {
        return;
      }

      if (!isHighRiskMemberAccess(node)) {
        return;
      }

      if (isReadFromConstObjectLiteral(node)) {
        return;
      }

      // Skip if this MemberExpression was already handled as part of an AssignmentExpression
      if (handledMemberExpressions.has(node)) {
        return;
      }

      // Skip the inner link of a chained computed access — report only the
      // OUTERMOST. For `a[b][c] = v`, `a[b]` and `a[b][c]` start at the same
      // source position, so reporting both is one defect twice.
      //
      // I removed both of these guards on 2026-08-19 believing coverage had
      // shown them dead, and five tests immediately reported EXTRA findings.
      // Coverage marks the `return` uncovered because no test reaches it, while
      // the condition itself runs constantly and is load-bearing. An uncovered
      // line is not a dead line, and that distinction cost a broken build.
      const parent = node.parent as TSESTree.Node | undefined;
      if (
        parent?.type === AST_NODE_TYPES.MemberExpression &&
        (parent as TSESTree.MemberExpression).computed &&
        (parent as TSESTree.MemberExpression).object === node
      ) {
        return;
      }

      // The assignment's left side is the AssignmentExpression visitor's to
      // report; this catches the case where visitor order beat the WeakSet.
      if (parent && parent.type === AST_NODE_TYPES.AssignmentExpression && parent.left === node) {
        return;
      }

      const { object, property, isAssignment, pattern } = extractPropertyAccess(node);

      const riskLevel = determineRiskLevel(pattern, isAssignment);

      context.report({
        node,
        messageId: 'objectInjection',
        data: {
          pattern: `${object}[${property}]`,
          riskLevel,
          vulnerability: pattern?.vulnerability || 'object injection',
          safeAlternative: pattern?.safeAlternative || 'Use Map or property whitelisting',
        }
      });
    };

    /**
     * Object.assign(target, untrustedSource) and `{ ...untrustedSource }`
     * spread into an object are functionally equivalent to `obj[k] = v`
     * for prototype-pollution purposes — they copy every enumerable
     * property of `source` onto `target`, including any `__proto__` /
     * `constructor` / `prototype` keys the source carries. The hand-
     * curated stress test surfaced this as an FN; closing it requires a
     * separate visitor since Object.assign is a CallExpression and
     * spread is a SpreadElement, not a MemberExpression. See
     * benchmarks/AUDIT_PATTERNS.md §3.4 ("equivalent merger patterns").
     */
    const checkObjectAssignSpread = (node: TSESTree.CallExpression) => {
      // Note: no isInCodemodContext guard here — the sole call site (the
      // CallExpression listener below) already returns before invoking this
      // function when isInCodemodContext is true, so a duplicate check here
      // would be unreachable dead code.
      if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;
      const callee = node.callee;
      const objectIsObject =
        callee.object.type === AST_NODE_TYPES.Identifier &&
        callee.object.name === 'Object';
      const propIsAssign =
        !callee.computed &&
        callee.property.type === AST_NODE_TYPES.Identifier &&
        callee.property.name === 'assign';
      if (!objectIsObject || !propIsAssign) return;
      // Object.assign({}, …) — first arg is fresh literal, no taint risk.
      if (node.arguments[0]?.type === AST_NODE_TYPES.ObjectExpression) return;
      // Sources are arguments[1...]. Any non-literal source is an
      // assumed taint source. Literals are safe (they're inline data).
      const sources = node.arguments.slice(1);
      const anyTaintedSource = sources.some(
        (s) =>
          s.type !== AST_NODE_TYPES.ObjectExpression &&
          s.type !== AST_NODE_TYPES.Literal,
      );
      if (!anyTaintedSource) return;
      context.report({
        node,
        messageId: 'objectInjection',
        data: {
          pattern: 'Object.assign(target, untrustedSource)',
          riskLevel: 'HIGH',
          vulnerability: 'object injection via Object.assign spread',
          safeAlternative:
            'Validate or whitelist keys before merging: `for (const k of Object.keys(src)) if (!ALLOWED.has(k)) continue;`',
        },
      });
    };
    /**
     * Recursive/shallow copy loops: `for (const k in src) { dst[k] = src[k] }`.
     *
     * This is THE canonical prototype-pollution primitive — it is how every real
     * `merge`/`extend`/`deepAssign` helper is written, and when `src` is attacker-supplied
     * a `__proto__` key walks straight onto Object.prototype. It was our only pollution
     * shape `eslint-plugin-security` caught and we did not: their `detect-object-injection`
     * flags it incidentally (it flags every `obj[key]`), ours did not because a `for...in`
     * binding does not look tainted to the identifier heuristic.
     *
     * Scoped deliberately to the copy-loop shape rather than all computed writes, so it adds
     * detection without adding their noise. Quiet when the body guards the key —
     * `hasOwnProperty`, a `__proto__`/`constructor` check, or an allowlist test.
     */
    /**
     * Mass assignment (CWE-915): `for (const k of Object.keys(req.body)) user[k] = req.body[k]`
     *
     * A different weakness from the pollution the `for...in` handler below
     * models, with a different fix. The attacker does not reach
     * `Object.prototype`; they pick WHICH FIELD of one object gets written, and
     * set `isAdmin` on it. Measured: `isAdmin` goes true.
     *
     * Gated on the ITERATED expression being untrusted, which is the fact that
     * matters and the one the spec got wrong at first. Two candidate guards were
     * measured and only one holds:
     *
     *   Object.keys(TARGET)   safe against pollution (a target's own keys cannot
     *                         include `__proto__` unless someone put it there) —
     *                         but NOT against mass assignment: if the target
     *                         already has `isAdmin`, the attacker still sets it.
     *   Object.keys(SOURCE)   unsafe for both. `JSON.parse('{"__proto__":…}')`
     *                         puts `__proto__` in `Object.keys`, verified.
     *
     * So "iterates Object.keys" is not a suppressor on its own; *keys of what*
     * decides. This reports only the untrusted-source form, which is the shape
     * with an attacker in it.
     */
    const checkMassAssignmentLoop = (node: TSESTree.ForOfStatement) => {
      if (isInCodemodContext) return;

      // `for (const k of Object.keys(X))` / `Object.entries(X)` / `Object.values(X)`
      const iterated = node.right;
      if (iterated.type !== AST_NODE_TYPES.CallExpression) return;
      const callee = iterated.callee;
      if (
        callee.type !== AST_NODE_TYPES.MemberExpression ||
        callee.computed ||
        callee.object.type !== AST_NODE_TYPES.Identifier ||
        callee.object.name !== 'Object' ||
        callee.property.type !== AST_NODE_TYPES.Identifier ||
        !['keys', 'entries'].includes(callee.property.name)
      ) {
        return;
      }
      const source = iterated.arguments[0];
      if (source === undefined || !isUntrustedExpression(source)) return;

      // The loop binding. Two spellings, and missing the second left the
      // `Object.entries` form — the more idiomatic one, since it avoids the
      // second lookup — undetected:
      //   for (const k of Object.keys(x))          -> Identifier
      //   for (const [k, v] of Object.entries(x))  -> ArrayPattern, key at [0]
      if (node.left.type !== AST_NODE_TYPES.VariableDeclaration) return;
      const bound = node.left.declarations[0]?.id;
      const keyName =
        bound?.type === AST_NODE_TYPES.Identifier
          ? bound.name
          : bound?.type === AST_NODE_TYPES.ArrayPattern &&
              bound.elements[0]?.type === AST_NODE_TYPES.Identifier
            ? bound.elements[0].name
            : null;
      if (keyName === null) return;

      // An allowlist inside the body is the remediation — naming the edit that
      // clears this finding is what keeps the rule satisfiable.
      const body = sourceCode.getText(node.body);
      if (/\b(includes|has|hasOwn|hasOwnProperty|indexOf)\s*\(/.test(body)) return;

      // A computed write keyed by the loop variable, anywhere in the body.
      let reported = false;
      const walk = (n: TSESTree.Node): void => {
        if (reported) return;
        if (
          n.type === AST_NODE_TYPES.AssignmentExpression &&
          n.left.type === AST_NODE_TYPES.MemberExpression &&
          n.left.computed &&
          n.left.property.type === AST_NODE_TYPES.Identifier &&
          n.left.property.name === keyName
        ) {
          reported = true;
          context.report({
            node: n,
            messageId: 'massAssignment',
            data: { key: keyName },
          });
          return;
        }
        for (const key of Object.keys(n)) {
          const child = (n as unknown as Record<string, unknown>)[key];
          if (key === 'parent' || child === null || typeof child !== 'object') continue;
          for (const c of Array.isArray(child) ? child : [child]) {
            if (c && typeof (c as TSESTree.Node).type === 'string') walk(c as TSESTree.Node);
          }
        }
      };
      walk(node.body);
    };

    /**
     * Is the object a `for…in` copy loop iterates something this file cannot
     * vouch for?
     *
     * Three ways in, in the order they cost:
     *
     * 1. A request-rooted expression — `req.body`, `ctx.request.body`. Decided by
     *    `isUntrustedExpression`, so `isLocallyConstructed` still disqualifies a
     *    `req` the file builds itself.
     * 2. A parameter — the `merge(target, source)` shape behind lodash.merge and
     *    deep-extend. The file cannot see what a caller passes.
     * 3. A single-assignment local whose initialiser is request-rooted. One
     *    binding hop is not a sanitiser, and requiring exactly one write is what
     *    stops `let s = req.body; s = SAFE_DEFAULTS` from being read as tainted.
     *
     * Anything else — a module-local object, an import, a literal — is not
     * armed. That asymmetry is the point: this predicate decides what to LOOK at,
     * and looking at every `for…in` in a codebase is how this rule earns a
     * reputation instead of a finding.
     */
    const isCopyLoopSourceOpaque = (source: TSESTree.Node): boolean => {
      if (isUntrustedExpression(source)) return true;
      if (source.type !== AST_NODE_TYPES.Identifier) return false;

      const variable = resolvedReference(sourceCode.getScope(source), source);
      if (!variable) return false;
      if (variable.defs.some((def) => def.type === 'Parameter')) return true;

      // The binding hop. More than one write means the declaration no longer
      // tells you what the loop iterates — the same trap that silenced a real
      // finding in `isLocallyConstructed` and in two other rules since.
      if (variable.references.filter((ref) => ref.isWrite()).length > 1) return false;
      const def = variable.defs[0];
      if (!def || def.type !== 'Variable') return false;
      const init = (def.node as TSESTree.VariableDeclarator).init;
      return init ? isUntrustedExpression(init) : false;
    };

    const checkPrototypePollutingCopyLoop = (node: TSESTree.ForInStatement) => {
      if (isInCodemodContext) return;

      // The binding introduced by `for (const k in ...)`.
      const keyName =
        node.left.type === AST_NODE_TYPES.VariableDeclaration
          ? node.left.declarations[0]?.id.type === AST_NODE_TYPES.Identifier
            ? node.left.declarations[0].id.name
            : undefined
          : node.left.type === AST_NODE_TYPES.Identifier
            ? node.left.name
            : undefined;
      if (!keyName) return;

      // Only report when the SOURCE is a function parameter — the reusable
      // `merge(target, source)` helper shape behind every real npm prototype-pollution CVE
      // (lodash.merge, deep-extend, …), where an attacker-supplied object reaches the loop.
      //
      // Copying an object the module itself owns (`for (const k in localConfig)`) is the
      // overwhelmingly common benign case, and an existing FP-regression test pins it as
      // safe. Requiring a parameter keeps the vulnerable shape and drops the benign one
      // instead of trading one team's false positives for another's.
      //
      // Ordered FIRST because it is O(scope depth) while the guard scan below is O(body
      // tokens): every `for...in` in the file used to pay the token scan, and a body
      // containing nested loops was rescanned once per enclosing level. These are pure
      // predicates, so hoisting the cheap one is behaviour-preserving — the same loops arm,
      // they just stop paying for a scan whose result is then discarded.
      //
      // Measured, 57 KB file, a 1500-line body wrapped in nested `for...in`, rule time only:
      //   loops over a LOCAL (the common case)  depth 128: 33.2 ms -> 4.2 ms, and flat in
      //     depth afterwards (4.7 / 5.4 / 4.2 ms at depth 1 / 16 / 128).
      //   loops over a PARAMETER (a real candidate) depth 128: 33.7 ms -> 32.8 ms, i.e.
      //     unchanged — a candidate still has to be scanned, so the rescan across nesting
      //     levels survives here. That residual is real and tracked; it needs the guard
      //     state to be accumulated during the single traversal instead of re-derived per
      //     loop, which is a redesign of this heuristic rather than a reordering.
      //
      // A PARAMETER is not the only opaque source. `for (const k in req.body)`
      // is a MemberExpression, so the Identifier-only test below returned before
      // any of this ran, and `const source = req.body` is an Identifier that is
      // not a Parameter — both are CWE-1321 with an attacker at the root, and
      // both were silent until the §B seal audit needed a reporting loop for a
      // positive control and this one did not report. So the test is: a
      // parameter, OR provably request-rooted. A module-local object is neither,
      // which is what keeps the benign majority quiet.
      if (!isCopyLoopSourceOpaque(node.right)) return;

      // TOKENS, not `getText`. Raw source text carries the comments with it, so an
      // ordinary `/* copy each prototype key */` inside the loop silenced the finding
      // entirely — a false negative anyone could trip by documenting their own code.
      // Joined without separators so multi-token guards still read as one string
      // (`Object` `.` `keys` -> `Object.keys`). String literals deliberately stay in:
      // `if (k === '__proto__') continue` is the documented guard and it IS a string.
      const bodyText = context.sourceCode
        .getTokens(node.body)
        .map((token) => token.value)
        .join('');
      // A guarded loop is the documented fix; do not report the fix.
      if (/hasOwnProperty|hasOwn|__proto__|constructor|prototype|includes\(|allowlist|whitelist|Object\.keys/.test(bodyText)) {
        return;
      }

      // Arm the loop and let ESLint's own traversal find the assignment. The previous
      // version recursively walked the whole body here, and ESLint then walked it AGAIN
      // — two passes per loop, and O(n²) once such loops nest. Nothing about the search
      // needed its own traversal: the assignment is an ordinary AssignmentExpression that
      // the visitor below already receives in source order.
      armedLoops.add(node);
      openCopyLoops.push({ keyName, reported: false });
    };

    /**
     * Reports the first key-write in each armed loop; returns true when it handled the node.
     *
     * Checked against EVERY open loop, not just the innermost, because
     * `for (a in x) { for (b in y) { t[a] = … } }` pollutes through the OUTER key — which
     * is what the old whole-subtree walk saw from the outer loop, and what a
     * top-of-stack-only check would miss.
     */
    const reportCopyLoopWrite = (node: TSESTree.AssignmentExpression): boolean => {
      if (
        node.left.type !== AST_NODE_TYPES.MemberExpression ||
        !node.left.computed ||
        node.left.property.type !== AST_NODE_TYPES.Identifier
      ) {
        return false;
      }
      const propertyName = node.left.property.name;
      const loop = openCopyLoops.find((open) => open.keyName === propertyName && !open.reported);
      if (!loop) return false;
      loop.reported = true;
      context.report({
        node,
        messageId: 'objectInjection',
        data: {
          riskLevel: 'HIGH',
          safeAlternative:
            'Guard the key before assigning: `if (k === "__proto__" || k === "constructor" || k === "prototype") continue;` — or copy with Object.create(null) / structuredClone.',
        },
      });
      return true;
    };

    return {
      ForOfStatement: checkMassAssignmentLoop,
      ForInStatement: checkPrototypePollutingCopyLoop,
      'ForInStatement:exit': (node: TSESTree.ForInStatement) => {
        // Only loops that armed above pushed a frame, and they nest, so the frame to drop
        // is always the last one — but only when this loop is the one that pushed it.
        if (armedLoops.has(node)) openCopyLoops.pop();
      },
      AssignmentExpression: (node: TSESTree.AssignmentExpression) => {
        if (isInCodemodContext) return;
        // A copy-loop key-write is reported as prototype pollution and must not also be
        // reported by the generic computed-assignment check.
        if (reportCopyLoopWrite(node)) return;
        return checkAssignmentExpression(node);
      },
      MemberExpression: (node: TSESTree.MemberExpression) => {
        if (isInCodemodContext) return;
        return checkMemberExpression(node);
      },
      CallExpression: (node: TSESTree.CallExpression) => {
        if (isInCodemodContext) return;
        return checkObjectAssignSpread(node);
      },
    };
  },
});

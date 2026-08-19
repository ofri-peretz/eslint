/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔒 LOCKED 2026-08-17 — read this whole block before changing anything here.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Scored against `eslint-plugin-security`'s rule of the same name, on 13 cases
 * derived from the weakness and verified by running them:
 *
 *   ours   TP 7/7  FP 0/7  F1 100.0%
 *   theirs TP 7/7  FP 3/7  F1  82.4%
 *
 * Recall was already identical before this work — both rules found all seven.
 * The entire gap is precision, and it came from two guards NEITHER rule
 * recognised. Pinned by `neutralised-pattern.test.ts`; 3 of its 12 cases fail
 * when the guards are disabled.
 *
 * ── THE WEAKNESS HAS TWO FACES ─────────────────────────────────────────────
 *
 *   DoS       `new RegExp('(a+)+$')` against 30 characters: 39,812 ms. The
 *             attacker does not need a bad pattern in your code — they supply one.
 *   BYPASS    `new RegExp('.*').test('totally-unrelated')` is TRUE. A caller who
 *             controls the pattern of an allow decision matches everything.
 *
 * The second is routinely forgotten and is NOT fixed by a regex timeout. Any
 * change here has to keep both in view.
 *
 * ── EDITS THAT LOOK CORRECT AND ARE NOT ────────────────────────────────────
 *
 *   ✗ "Escaping does not really make it safe."
 *     Measured: the same `(a+)+$` pattern is 39,812 ms raw and **0.0 ms** after
 *     `.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` — there are no quantifiers left,
 *     it matches six literal characters. It is also the remediation this rule's
 *     own message recommends, and reporting a developer who followed it makes
 *     the rule unsatisfiable.
 *
 *   ✗ "Detect the escape by its name — `escapeRegExp`, `escapeRe`, …"
 *     That is defeated by `const escapeRegExp = (s) => s`, which this ecosystem
 *     has already shipped once as a sanitiser allowlist. `isNeutralised` keys on
 *     the SEARCH ARGUMENT being a regex literal with a metacharacter class, and
 *     the fake-escaper CONTROL (`.replace(/foo/g,'bar')`) pins it.
 *
 *   ✗ "A closed-set lookup is still dynamic."
 *     `PATTERNS[req.query.kind]` lets the caller choose WHICH pattern, never
 *     WHAT. Neither face of the weakness is reachable, and it is the rule's own
 *     `good:` example.
 *
 *   ✗ "Resolve the escape through the binding and stop there."
 *     Only with a reassignment check. `let p = raw.replace(...); p = req.query.raw`
 *     is escaped at the declaration and raw where it is used — the same trap
 *     `detect-object-injection` and `detect-non-literal-fs-filename` both fell
 *     into. There is a CONTROL case for it.
 *
 *   ✗ "`new RegExp(SOME_CONST)` should report — it is not a literal."
 *     "Dynamic" means an attacker can change the pattern, not that it is spelled
 *     as something other than a literal. `isStaticExpression` follows const
 *     bindings, template parts and concatenation; a build-time constant is not a
 *     finding, and eslint-plugin-security's own corpus marks it valid.
 *
 * ── KNOWN OPEN, MEASURED: the corpus gap does NOT show at scale ────────────
 *
 * Corpus 100.0% vs 70.6%, but on 5 real repositories we report 227 and they
 * report 236 — **1.0x**. Unlike `detect-non-literal-fs-filename` (60x quieter),
 * the two guards added here are rare in real code, so the corpus advantage is
 * real and almost irrelevant to what a maintainer sees.
 *
 * Hand-reading 10 of our 177 n8n findings: the dominant class is a template
 * interpolating the PROGRAM'S OWN data — a TypeORM column name, a parameter
 * name, a config key, `parts.join('/')`. `isStaticExpression` cannot prove those
 * constant because they arrive through a function parameter or an object
 * property, so the rule reports. No attacker is present in any of them.
 *
 * That is the same question `detect-non-literal-fs-filename` answers with
 * `WHOLE_VALUE_TRUSTED_ROOTS`: not "is this dynamic" but WHO SUPPLIES IT. This
 * rule has no equivalent, and closing it is the next real precision work here —
 * NOT more guard idioms.
 *
 * One case worth naming: `safeRegex.worker.ts` compiles `request.pattern` inside
 * a worker deliberately, which IS the mitigation for this weakness. Reporting
 * the mitigation is the unsatisfiable-rule failure mode, and it is unresolved.
 *
 * ── WHAT LEGITIMATELY REOPENS THIS FILE ────────────────────────────────────
 *
 *   1. A new way to reach the RegExp intrinsic (a spelling `isRegExpConstructor`
 *      does not resolve).
 *   2. A new neutralising idiom, WITH the measurement showing it neutralises —
 *      time the pattern before and after.
 *   3. A shared helper it imports changing behaviour.
 *
 * To change it: add the case to `neutralised-pattern.test.ts` with its
 * measurement, verify the test FAILS with your change reverted, move this date.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ESLint Rule: detect-non-literal-regexp
 * Detects a caller-steerable pattern reaching the RegExp constructor.
 *
 * @see https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS
 * @see https://cwe.mitre.org/data/definitions/400.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, isStaticExpression, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import {
  isEnvironmentGlobal,
  isRegExpConstructor,
  resolveVariable,
} from '../../utils/regexp-intrinsic';

type MessageIds =
  | 'regexpReDoS';

/**
 * `additionalPatterns` used to be declared here, in `meta.schema` and in
 * `defaultOptions`. `create()` never read it — not in this revision and not in
 * any revision `git log -S` can find. Setting it did nothing, and because
 * `additionalProperties: false` accepted it, a consumer got no signal either.
 * Removed rather than implemented: inventing a second RegExp-constructor
 * vocabulary would change detection on every repository that never asked for
 * it, and this rule's numbers are published.
 */
export interface Options {
  /**
   * Allow literal string regex patterns — `new RegExp('^[a-z]+$')`.
   * Default: true. A rule named "non-literal" reporting a literal by default
   * contradicted its own contract. Set false to prefer `/…/` literal syntax.
   */
  allowLiterals?: boolean;
  
  
  /** Maximum allowed pattern length for dynamic regex */
  maxPatternLength?: number;
}

type RuleOptions = [Options?];

/**
 * RegExp creation patterns and their security implications
 */
interface RegExpPattern {
  pattern: string;
  dangerous: boolean;
  vulnerability: 'redos' | 'injection' | 'performance';
  safeAlternative: string;
  example: { bad: string; good: string };
  effort: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

const REGEXP_PATTERNS: RegExpPattern[] = [
  {
    pattern: 'new RegExp\\(.*\\)',
    dangerous: true,
    vulnerability: 'redos',
    safeAlternative: 'Pre-defined RegExp constants',
    example: {
      bad: 'new RegExp(userInput)',
      good: 'const PATTERNS = { email: /^[a-zA-Z0-9]+$/ }; PATTERNS[userChoice]'
    },
    effort: '10-15 minutes',
    riskLevel: 'high'
  },
  {
    pattern: 'RegExp\\(.*\\)',
    dangerous: true,
    vulnerability: 'redos',
    safeAlternative: 'Static RegExp literals or validated patterns',
    example: {
      bad: 'RegExp(userPattern)',
      // oxlint-disable-next-line no-template-curly-in-string
      good: 'const safePattern = userPattern.replace(/[.*+?^${}()|[\\]\\\\]/g, \'\\\\$&\'); new RegExp(`^${safePattern}$`)'
    },
    effort: '15-20 minutes',
    riskLevel: 'high'
  },
  {
    pattern: '/.*\\*\\*.*|.*\\+\\+.*|.*\\?\\?/',
    dangerous: true,
    vulnerability: 'redos',
    safeAlternative: 'Avoid nested quantifiers, use atomic groups',
    example: {
      bad: '/(a+)+b/', // ReDoS vulnerable
      good: '/(?>a+)b/', // Atomic group (if supported) or restructure
    },
    effort: '20-30 minutes',
    riskLevel: 'critical'
  }
];

/**
 * String/array methods that turn constant inputs into a constant output.
 *
 * Deliberately short: every entry has to be a pure transformation whose result
 * depends on nothing but its receiver and arguments. `map`/`filter` take a
 * callback and are excluded — the callback could read anything.
 */
const CONSTANT_PRESERVING_METHODS: ReadonlySet<string> = new Set([
  'join',
  'concat',
  'toUpperCase',
  'toLowerCase',
  'trim',
  'slice',
  'repeat',
]);

// `isRegExpConstructor`, `GLOBAL_NAMESPACES` and the scope-chain resolver used
// to live here. They moved to ../../utils/regexp-intrinsic.ts on 2026-08-18,
// when an adversarial wave found `no-redos-vulnerable-regex` blind to two
// spellings this rule had already learned — `const R = RegExp; new R(p)` and
// `new globalThis.RegExp(p)`. One rule knowing something its sibling does not is
// the defect a shared resolver removes: a new way to reach the intrinsic is now
// learned once, by both.

/**
 * `String.raw` used as a template tag, on the real intrinsic.
 *
 * `String.raw` is how a regex source is written without doubling every
 * backslash — TypeScript's own handbook recommends it for constructed patterns.
 * The produced string is fixed at parse time; only the node type differs from a
 * plain literal.
 */
function isStringRawTag(node: TSESTree.Node, sourceCode: TSESLint.SourceCode): boolean {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property.type === 'Identifier' &&
    node.property.name === 'raw' &&
    node.object.type === 'Identifier' &&
    node.object.name === 'String' &&
    isEnvironmentGlobal(node.object.name, sourceCode.getScope(node.object))
  );
}

/**
 * Can the program determine this value before any input arrives?
 *
 * The rule previously asked only "is this a string literal?", so
 * `new RegExp('\\{' + i + '\\}')` over a loop counter and
 * `new RegExp(`${SUPPORTED_EXTS.join('|')}$`)` over a module constant were
 * both reported as attacker-controlled ReDoS. Neither is: nothing outside the
 * program can change what those patterns compile to. That single question
 * accounted for most of this rule's 49 corpus findings.
 *
 * Resolution is intentionally conservative — anything it cannot follow to a
 * literal (a parameter, an import, a property of an unknown object) is NOT
 * treated as constant, so unknown provenance still reports.
 */
function isBuildTimeConstant(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  depth = 0,
): boolean {
  // Bounded walk: a cyclic or absurdly deep expression resolves to "unknown",
  // which reports. Erring toward a finding is the safe direction here.
  if (depth > 6) {
    return false;
  }

  switch (node.type) {
    case 'Literal':
      return true;
    case 'TemplateLiteral':
      return node.expressions.every((expression) =>
        isBuildTimeConstant(expression, sourceCode, depth + 1),
      );
    case 'BinaryExpression':
      return (
        node.operator === '+' &&
        isBuildTimeConstant(node.left as TSESTree.Node, sourceCode, depth + 1) &&
        isBuildTimeConstant(node.right, sourceCode, depth + 1)
      );
    case 'ArrayExpression':
      return node.elements.every(
        (element) =>
          element !== null &&
          element.type !== 'SpreadElement' &&
          isBuildTimeConstant(element, sourceCode, depth + 1),
      );
    case 'CallExpression':
      return (
        node.callee.type === 'MemberExpression' &&
        node.callee.property.type === 'Identifier' &&
        CONSTANT_PRESERVING_METHODS.has(node.callee.property.name) &&
        isBuildTimeConstant(node.callee.object, sourceCode, depth + 1) &&
        node.arguments.every(
          (argument) =>
            argument.type !== 'SpreadElement' &&
            isBuildTimeConstant(argument, sourceCode, depth + 1),
        )
      );
    case 'TaggedTemplateExpression':
      return (
        isStringRawTag(node.tag, sourceCode) &&
        node.quasi.expressions.every((expression) =>
          isBuildTimeConstant(expression, sourceCode, depth + 1),
        )
      );
    case 'Identifier':
      return isConstantBinding(node, sourceCode, depth);
    default:
      return false;
  }
}

/** Resolve an identifier to its single declaration and judge that. */
function isConstantBinding(
  node: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
  depth: number,
): boolean {
  const variable = resolveVariable(node.name, sourceCode.getScope(node));
  // Shadowed or re-declared bindings are not worth reasoning about.
  if (variable === null || variable.defs.length !== 1) {
    return false;
  }

  const definition = variable.defs[0]!;
  if (definition.type !== 'Variable') {
    return false;
  }

  // A `for (let i = 0; …)` counter is driven by the loop, not by input.
  if (definition.parent.parent?.type === 'ForStatement') {
    return true;
  }

  const init = definition.node.init;

  // `for (const source of REDACTION_SOURCES)` — the binding carries no
  // initialiser of its own, so reading `declarator.init` finds `null` and the
  // old check gave up. What the binding can hold is decided entirely by the
  // iterable, and a module constant of literals is as fixed as the
  // `CONST_ARRAY.join('|')` shape this function already cleared. Covering one
  // and not the other was an accident of node types, not a security judgement.
  if (init === null) {
    const loop = definition.parent.parent;
    return (
      loop?.type === 'ForOfStatement' &&
      loop.left === definition.parent &&
      isBuildTimeConstant(loop.right, sourceCode, depth + 1)
    );
  }

  if (!isBuildTimeConstant(init, sourceCode, depth + 1)) {
    return false;
  }

  // The declaration KEYWORD was the old test, and it is the wrong question.
  // `let source = '^\d+$'; if (mode === 'word') source = '^\w+$';` can only ever
  // hold one of the strings written in this file — the set of values is closed
  // whatever the keyword says. What matters is that every write is itself
  // build-time constant.
  //
  // Two write shapes must not clear the binding. A write whose expression is
  // itself unproven — `for (p of userPatterns)` over an already-declared
  // binding, which scope analysis records with the ITERABLE as the written
  // expression — fails the constant test below. A write with no inspectable
  // expression at all (`p++`, an UpdateExpression, which carries no
  // `writeExpr`) has nothing to test and is refused outright. Both leave the
  // value unproven, which is the safe direction: the cost is a report, never a
  // missed vulnerability.
  return variable.references.every((reference) => {
    if (!reference.isWrite()) {
      return true;
    }
    const written = reference.writeExpr;
    if (!written) {
      return false;
    }
    return written === init || isBuildTimeConstant(written, sourceCode, depth + 1);
  });
}


/**
 * Is this construction a CLONE of an existing RegExp?
 *
 * `.source` is a string the ENGINE produced from an already-compiled pattern,
 * not one a caller supplied, so a clone cannot introduce backtracking the
 * original did not have. Executed against `recheck` rather than argued — see
 * REGEXP-FACTS.md in this rule's corpus: four patterns, spanning safe and
 * exponential, cloned byte-identically with the oracle returning the same
 * verdict for original and copy in every case.
 *
 * So a finding here is a DUPLICATE (the original is a literal that
 * `no-redos-vulnerable-regex` already reports, with proof) or a MISATTRIBUTION
 * (it points at the copy instead of the pattern). Measured on 20 repositories:
 * 7 cases, 10 findings, in mongoose, webpack, n8n and nest.
 *
 * ## Why this asks about SHAPE and never about the receiver's name
 *
 * `regexp.source` and `config.source` are both, syntactically, a property read
 * off a parameter. Nothing distinguishes them but the identifier the author
 * chose, and deciding by that is the defect `lint:name-inference` gates: a
 * project whose regex is held in `p` would get no credit, and one whose
 * `config` happens to carry a `.source` string would be silently exempted.
 *
 * Two things ARE evidence, and both are structural:
 *
 *   1. `new RegExp(X.source, X.flags)` — the same receiver, read through two
 *      accessors the language defines only on RegExp, feeding the pattern and
 *      flags positions of a RegExp constructor. That is the clone idiom itself,
 *      not a guess about what `X` is called. `.source` ALONE is not enough:
 *      any object may carry one, which is what the `config.source` control
 *      pins.
 *   2. The receiver resolves, in this file, to a regular expression — a regex
 *      literal or a RegExp construction. Then it is a RegExp because the
 *      program says so.
 *
 * Deliberately NOT treated as a clone: `new RegExp(re.source + '$', re.flags)`,
 * which nestjs/nest uses. Appending a literal is usually harmless and "usually"
 * is not a contract — a literal may itself carry a quantifier (`re.source +
 * '+'`). Only the pure form is claimed, so that shape keeps its finding.
 */
function isRegExpClone(
  node: TSESTree.CallExpression | TSESTree.NewExpression,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const [patternArg, flagsArg] = node.arguments;
  if (
    patternArg?.type !== 'MemberExpression' ||
    patternArg.computed ||
    patternArg.property.type !== 'Identifier' ||
    patternArg.property.name !== 'source'
  ) {
    return false;
  }

  const receiver = patternArg.object;

  // (1) The same receiver also supplies `.flags`.
  if (
    flagsArg?.type === 'MemberExpression' &&
    !flagsArg.computed &&
    flagsArg.property.type === 'Identifier' &&
    flagsArg.property.name === 'flags' &&
    sourceCode.getText(flagsArg.object) === sourceCode.getText(receiver)
  ) {
    return true;
  }

  // (2) The receiver resolves to a regular expression in this file.
  if (receiver.type !== 'Identifier') {
    return false;
  }
  const variable = resolveVariable(receiver.name, sourceCode.getScope(receiver));
  const def = variable?.defs.length === 1 ? variable.defs[0] : null;
  if (!def || def.type !== 'Variable' || def.node.type !== 'VariableDeclarator') {
    return false;
  }
  const init = def.node.init;
  if (!init) {
    return false;
  }
  return (
    // `'regex' in init` is the whole test: a RegExpLiteral always carries the
    // property and a string literal never does. An `init.regex !== undefined`
    // tail was here first and is unreachable behind the `in` check — deleted
    // rather than covered, since a branch no input can take is not a branch.
    (init.type === 'Literal' && 'regex' in init) ||
    ((init.type === 'NewExpression' || init.type === 'CallExpression') &&
      isRegExpConstructor(init.callee, sourceCode))
  );
}

export const detectNonLiteralRegexp = createRule<RuleOptions, MessageIds>({
  name: 'detect-non-literal-regexp',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/detect-non-literal-regexp.md',
      description: 'Detects RegExp(variable), which might allow an attacker to DOS your server with a long-running regular expression',
      cwe: 'CWE-400',
    },
    messages: {
      // 🎯 Token optimization: 41% reduction (51→30 tokens) - compact template variables
      regexpReDoS: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'ReDoS vulnerability',
        cwe: 'CWE-400',
        description: 'ReDoS vulnerability detected',
        severity: '{{riskLevel}}',
        // §C2.4 — names the safe shapes so a reader can close the finding.
        fix: '{{safeAlternative}} — Not a finding when the pattern is a module constant, a closed-set lookup, or escaped before construction',
        documentationLink: 'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS',
      }),
},
    schema: [
      {
        type: 'object',
        properties: {
          allowLiterals: {
            type: 'boolean',
            // TRUE, matching `defaultOptions` and the runtime. The schema said
            // `false` while `create()` destructured `= true` and the rule stayed
            // quiet on `new RegExp('^[a-z]+$')` — so the schema, which is what
            // IDE tooling and the docs generator read, told a consumer the
            // opposite of what the rule does. Caught auditing against
            // BENCHMARK-CRITERIA.md §B2, not by any test: nothing asserted the
            // schema default and the destructured default agree.
            default: true,
            description:
              'Allow literal string regex patterns — `new RegExp(\'^[a-z]+$\')`. ' +
              'A rule named "non-literal" reporting a literal by default contradicted ' +
              'its own contract. Set false to prefer `/…/` literal syntax; measured ' +
              'effect on the 30-fixture corpus: +6 findings, all on safe/ files.'
          },
          maxPatternLength: {
            type: 'number',
            default: 100,
            minimum: 1,
            description: 'Maximum allowed pattern length for dynamic regex'
          }
        },
        additionalProperties: false,
      },
    ],
  },
  skipTestFiles: true, // §B1 — independent of the harness
  defaultOptions: [
    {
      allowLiterals: true,
      maxPatternLength: 100
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    // `options` is always an object here (defaulted just above), so a
    // second `|| {}` fallback could never fire — removed as dead code.
    const {
      allowLiterals = true,
      maxPatternLength = 100,
    }: Options = options;

    /**
     * Check if a node is a literal string (potentially safe)
     * Includes template literals without expressions
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isLiteralString = (node: TSESTree.Node): boolean => {
      if (node.type === 'Literal' && typeof node.value === 'string') {
        return true;
      }
      // Template literals without expressions are also static/safe
      if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
        return true;
      }
      return false;
    };

    /**
     * Extract regex pattern from RegExp construction
     */
    const extractPattern = (node: TSESTree.CallExpression | TSESTree.NewExpression): {
      pattern: string;
      patternNode: TSESTree.Node | null;
      constructor: string;
      isDynamic: boolean;
      length: number;
    } => {
      const sourceCode = context.sourceCode;

      // Determine constructor type
      let constructor = 'RegExp';
      if (node.type === 'NewExpression' && node.callee.type === 'Identifier') {
        constructor = `new ${node.callee.name}`;
      }

      /**
       * Has the attacker's control over this pattern been NEUTRALISED?
       *
       * Two guards, both verified by running them:
       *
       * **1. Regex escaping.** `attacker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`
       * turns every metacharacter into a literal. Measured: the pattern
       * `(a+)+$` takes **39,812 ms** through `new RegExp` unescaped and
       * **0.0 ms** escaped, because after escaping there are no quantifiers
       * left to backtrack over — it matches the six characters `(a+)+$`.
       *
       * This is also the remediation the rule's own message recommends, and
       * reporting a developer who followed it makes the rule unsatisfiable.
       *
       * Recognised STRUCTURALLY: a `.replace()` whose first argument is a regex
       * literal containing a metacharacter class, not a call named
       * `escapeRegExp`. A name-based check would be defeated by
       * `const escapeRegExp = (s) => s`, which is the failure mode this
       * ecosystem already shipped once with a sanitiser allowlist.
       *
       * **2. Closed-set lookup.** `PATTERNS[req.query.kind]` can only yield a
       * pattern the program wrote. The caller picks WHICH, never WHAT, so
       * neither the DoS nor the semantic bypass is reachable — and the bypass
       * matters here as much as the DoS: an attacker who supplies `.*` to an
       * allow decision matches everything, verified.
       */
      const isNeutralised = (patternNode: TSESTree.Node): boolean => {
        const escaped = (n: TSESTree.Node): boolean => {
          if (n.type !== 'CallExpression') return false;
          const callee = (n as TSESTree.CallExpression).callee;
          if (
            callee.type !== 'MemberExpression' ||
            callee.computed ||
            callee.property.type !== 'Identifier' ||
            callee.property.name !== 'replace'
          ) {
            return false;
          }
          const search = (n as TSESTree.CallExpression).arguments[0];
          if (search === undefined || search.type !== 'Literal') return false;
          const re = (search as TSESTree.RegExpLiteral).regex;
          // A character class carrying regex metacharacters is the escaping
          // idiom; `.replace(/foo/g, 'bar')` is not and must not suppress.
          return re !== undefined && /\[[^\]]*[.*+?^${}()|][^\]]*\]/.test(re.pattern);
        };
        if (escaped(patternNode)) return true;

        // Follow ONE binding hop: `const safe = raw.replace(...); new RegExp(safe)`.
        if (patternNode.type === 'Identifier') {
          const v = context.sourceCode
            .getScope(patternNode)
            .references.find((r) => r.identifier === patternNode)?.resolved;
          if (v && v.defs.length === 1 && v.defs[0].type === 'Variable') {
            // A reassigned binding no longer holds what it was declared with.
            if (v.references.filter((r) => r.isWrite()).length > 1) return false;
            const init = (v.defs[0].node as TSESTree.VariableDeclarator).init;
            if (init && escaped(init)) return true;
            // Closed-set lookup: `PATTERNS[k]` where PATTERNS is a literal map
            // this file wrote.
            if (init?.type === 'MemberExpression' && init.computed) {
              const obj = init.object;
              if (obj.type === 'Identifier') {
                const ov = context.sourceCode
                  .getScope(obj)
                  .references.find((r) => r.identifier === obj)?.resolved;
                const oinit =
                  ov && ov.defs.length === 1 && ov.defs[0].type === 'Variable'
                    ? (ov.defs[0].node as TSESTree.VariableDeclarator).init
                    : undefined;
                if (
                  oinit?.type === 'ObjectExpression' ||
                  oinit?.type === 'ArrayExpression'
                ) {
                  return true;
                }
              }
            }
          }
        }
        return false;
      };

      // First argument is the pattern
      const patternNode = node.arguments.length > 0 ? node.arguments[0] : null;
      const pattern = patternNode ? sourceCode.getText(patternNode) : '';
      // "Dynamic" means an attacker can change the pattern, not that it is spelled
      // as something other than a literal. `const source = 'ab+c'; new RegExp(source)`
      // is fixed at build time — a case eslint-plugin-security's own corpus marks
      // valid, and one we reported. `isStaticExpression` follows const bindings,
      // template parts and concatenation through ESLint's scope analysis.
      //
      // `isLiteralString` still gates the LENGTH below: that path reads
      // `patternNode.value` directly, which only exists on an actual literal node.
      const isDynamic = patternNode
        ? !isStaticExpression({ node: patternNode, scope: context.sourceCode.getScope(patternNode) }) &&
          !isNeutralised(patternNode)
        : false;
      const length = patternNode && isLiteralString(patternNode) ?
                     String((patternNode as TSESTree.Literal).value).length : pattern.length;

      return { pattern, patternNode, constructor, isDynamic, length };
    };

    /**
     * Detect the specific vulnerability pattern
     */
    const detectVulnerability = (pattern: string, isDynamic: boolean): RegExpPattern => {
      // Check for dynamic construction first (highest risk)
      if (isDynamic) {
        for (const vuln of REGEXP_PATTERNS) {
          if (new RegExp(vuln.pattern, 'i').test(pattern)) {
            return vuln;
          }
        }
        // Generic dynamic RegExp construction
        return {
          pattern: 'dynamic',
          dangerous: true,
          vulnerability: 'redos',
          safeAlternative: 'Pre-defined RegExp constants',
          example: {
            bad: pattern,
            good: 'const PATTERNS = { email: /^[a-zA-Z0-9]+$/ }; PATTERNS[type]'
          },
          effort: '10-15 minutes',
          riskLevel: 'high'
        };
      }

      // A literal pattern is not a *non-literal* regexp. It only reaches here
      // when `allowLiterals` is off, i.e. the user asked to be told about
      // `new RegExp('…')` in favour of `/…/` syntax. ReDoS inside a literal is
      // `no-redos-vulnerable-regex`'s remit, which runs a real automaton
      // analysis instead of the two hand-written regexes that used to live here.
      return {
        pattern: 'literal-construction',
        dangerous: false,
        vulnerability: 'redos',
        safeAlternative: 'Regex literal syntax',
        example: {
          bad: `new RegExp(${pattern})`,
          good: '/pattern/',
        },
        effort: '2 minutes',
        riskLevel: 'high',
      };
    };

    /**
     * Generate refactoring steps based on the vulnerability
     */
    // oxlint-disable-next-line consistent-function-scoping
    const generateRefactoringSteps = (vulnerability: RegExpPattern): string => {
      if (vulnerability.pattern === 'dynamic') {
        return [
          '   1. Create a whitelist of allowed regex patterns',
          '   2. Use object lookup: PATTERNS[userChoice]',
          '   3. If dynamic needed: escape input with regex escaping function',
          '   4. Add pattern length validation',
          '   5. Consider using a safe regex library'
        ].join('\n');
      }

      if (vulnerability.pattern === 'literal-construction') {
        return [
          '   1. Replace new RegExp(\'…\') with a /…/ literal',
          '   2. Keep the flags as literal suffixes: /…/gi',
          '   3. Escaping differs: a literal needs one backslash, not two'
        ].join('\n');
      }

      // Every `RegExpPattern` constructed in this module has
      // `vulnerability: 'redos'` (see REGEXP_PATTERNS above and the two
      // object literals returned from `detectVulnerability`) — there is no
      // code path that ever produces `'injection'` or another value, so
      // this is the only reachable case. Kept as a direct return (not a
      // switch) to avoid unreachable branches that no test could ever hit.
      return [
        '   1. Avoid nested quantifiers and backreferences',
        '   2. Use possessive quantifiers: *+, ++, ?+',
        '   3. Restructure regex to be more specific',
        '   4. Test with potentially malicious inputs',
        '   5. Consider safe-regex library validation'
      ].join('\n');
    };

    /**
     * Determine overall risk level
     */
    // Every `RegExpPattern` ever constructed in this module (REGEXP_PATTERNS
    // entries, and the two object literals in `detectVulnerability`) sets
    // `riskLevel` to only `'high'` or `'critical'` — never `'medium'` or
    // `'low'` — so those two branches are the only reachable outcomes.
    const determineRiskLevel = (vulnerability: RegExpPattern): string => {
      if (vulnerability.riskLevel === 'critical') {
        return 'CRITICAL';
      }

      return 'HIGH';
    };

    /**
     * Check RegExp constructor calls for vulnerabilities
     */
    const checkRegExpCall = (node: TSESTree.CallExpression | TSESTree.NewExpression) => {
      // A clone of an existing RegExp carries the original's backtracking and
      // adds none of its own — proven by execution, see `isRegExpClone`.
      if (isRegExpClone(node, context.sourceCode)) {
        return;
      }

      // Does the callee resolve to the intrinsic RegExp constructor? Asked of
      // the BINDING, not of the spelling at the call site — see
      // `isRegExpConstructor`.
      if (!isRegExpConstructor(node.callee, context.sourceCode)) {
        return;
      }

      const { pattern, patternNode, isDynamic, length } = extractPattern(node);

      if (!patternNode) {
        return;
      }

      if (isDynamic) {
        // The pattern is built, but the program decides every part of it —
        // a loop counter, a module constant, `CONST_ARRAY.join('|')`. Nothing
        // outside the process can change what this compiles to.
        if (isBuildTimeConstant(patternNode, context.sourceCode)) {
          return;
        }
      } else if (allowLiterals && length <= maxPatternLength) {
        return;
      }

      const vulnerability = detectVulnerability(pattern, isDynamic);

      // `detectVulnerability` always returns non-null when `isDynamic` is
      // true (either a matched REGEXP_PATTERNS entry or its own generic
      // "dynamic" object), so `vulnerability` can only be null when
      // `isDynamic` is false — meaning a synthetic `isDynamic ? {...} :
      // Both branches of `detectVulnerability` return an object — the dynamic
      // one and the literal-construction one — so there is no null to guard.
      const riskLevel = determineRiskLevel(vulnerability);
      const steps = generateRefactoringSteps(vulnerability);

      context.report({
        node,
        messageId: 'regexpReDoS',
        data: {
          pattern: pattern.substring(0, 30) + (pattern.length > 30 ? '...' : ''),
          riskLevel,
          vulnerability: vulnerability.vulnerability,
          safeAlternative: vulnerability.safeAlternative,
          steps,
          effort: vulnerability.effort
        },});
    };

    return {
      CallExpression: checkRegExpCall,
      NewExpression: checkRegExpCall
    };
  },
});

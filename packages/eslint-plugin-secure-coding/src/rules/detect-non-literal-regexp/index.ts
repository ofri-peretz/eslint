/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔒 LOCKED 2026-11-02 — read this whole block before changing anything here.
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
 * Reopened 2026-11-02 (mutation triage), each change pinned by a case that
 * fails with it reverted:
 *   - the escape guard accepted ANY class holding one metacharacter, with or
 *     without `g` — `/[.]/g` (1,314 ms) and the full class without `g`
 *     (2,779 ms) left `(a+)+$` intact. It now needs one global class naming
 *     all fourteen metacharacters (neutralised-pattern.test.ts, `FN:` cases);
 *   - the closed-set guard accepted any literal table, unread and unwritten-
 *     checked; it now lives in the constant walk, which checks every entry and
 *     every write through the table, destructuring and loop heads included —
 *     and the direct spelling `new RegExp(P[k])`, which reported while the
 *     one-hop spelling did not, is now judged the same way;
 *   - the same escape spelled `.replaceAll(…)`, or with its search held in a
 *     binding written once (lodash's own `reRegExpChar`), reported; both are
 *     the identical regex applied the identical way (neutralised-pattern.test.ts);
 *   - what-the-walk-proves.test.ts holds the rest (`FP:`/`FN:` cases).
 * The corpus numbers below predate this and have not been re-measured.
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
import {
  formatLLMMessage,
  isStaticExpression,
  MessageIcons,
  staticString,
  namesOneOf,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import {
  isEnvironmentGlobal,
  isRegExpConstructor,
  resolveVariable,
  asDirectConstruction,
} from '../../utils/regexp-intrinsic';

type MessageIds = 'runtimeDecidedPattern';

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
 * String/array methods that turn constant inputs into a constant output.
 *
 * Deliberately short: every entry has to be a pure transformation whose result
 * depends on nothing but its receiver and arguments. `map`/`filter` take a
 * callback and are excluded — the callback could read anything.
 *
 * @protocol-constant Method names from the ECMAScript String and Array
 * prototypes, selected by the language's own semantics: each returns a value
 * determined solely by its receiver and arguments. A consumer cannot add a
 * seventh — adding one asserts that some other method is pure, which would make
 * the rule treat a runtime-decided pattern as constant and go silent on it, and
 * removing one turns `'a'.trim()` back into a finding. The set is a fact about
 * the language, not a vocabulary about anyone's domain.
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
function isStringRawTag(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  return (
    node.type === 'MemberExpression' &&
    propertyName(node) === 'raw' &&
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
  // which reports. Erring toward a finding is the safe direction here. The
  // bound is what ends a binding that feeds itself — `p = p + '|b'` — so every
  // step below that can come back round to the same binding adds one.
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
      // Any operator over constants is a constant: `'{' + width * 2 + '}'`
      // can no more change than `'{' + width + '}'` can. This used to accept
      // `+` alone, which devkit's `isStaticExpression` — the first question
      // this rule asks — never did; the two walks gave `width * 2` opposite
      // verdicts depending on whether the operand was a `const`.
      return (
        isBuildTimeConstant(node.left, sourceCode, depth + 1) &&
        isBuildTimeConstant(node.right, sourceCode, depth + 1)
      );
    case 'ArrayExpression':
      // A spread is constant exactly when what it spreads is: `[...CONST]` can no more
      // change than `CONST` can, and the rule already accepts `CONST.join()`. Bailing on
      // sight of a SpreadElement gave the two spellings of one value opposite verdicts.
      // The argument still has to prove itself, so `[...rest]` over a parameter — and
      // `[...new Set(…)]`, whose contents are reachable through .add/.delete — report.
      return node.elements.every(
        (element) =>
          element !== null &&
          isBuildTimeConstant(unspread(element), sourceCode, depth + 1),
      );
    case 'CallExpression':
      // The same holds for arguments: `A.concat(...B)` is `A.concat([...B])`.
      return (
        node.callee.type === 'MemberExpression' &&
        namesOneOf(propertyName(node.callee), CONSTANT_PRESERVING_METHODS) &&
        isBuildTimeConstant(node.callee.object, sourceCode, depth + 1) &&
        node.arguments.every((argument) =>
          isBuildTimeConstant(unspread(argument), sourceCode, depth + 1),
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
    // `{ … } as const` and `<const>{ … }` — the annotation is not the value.
    case 'TSAsExpression':
    case 'TSTypeAssertion':
      return isBuildTimeConstant(node.expression, sourceCode, depth + 1);
    case 'ObjectExpression':
      // A table is constant when every value it can hand out is. Keys do not
      // enter into it — `{ [K]: '^a$' }` holds the same one string whatever K
      // is — and a spread is judged by what it spreads, as in an array.
      return node.properties.every((property) =>
        isBuildTimeConstant(
          property.type === 'SpreadElement'
            ? property.argument
            : (property.value as TSESTree.Node),
          sourceCode,
          depth + 1,
        ),
      );
    case 'MemberExpression':
      return isConstantTableLookup(node, sourceCode, depth);
    default:
      return false;
  }
}

/** What an element or argument contributes: a spread contributes what it spreads. */
function unspread(
  node: TSESTree.Expression | TSESTree.SpreadElement,
): TSESTree.Node {
  return node.type === 'SpreadElement' ? node.argument : node;
}

/**
 * `PATTERNS.email` or `PATTERNS[kind]`, where PATTERNS is a table the program
 * fully decides.
 *
 * The rule's own documentation has recommended this shape as the safe
 * alternative for as long as it has existed — `const PATTERNS = {...};
 * PATTERNS[userChoice]` — and reported it anyway. An adversarial wave caught
 * that on 2026-08-19.
 *
 * A named key reads one entry, so that entry has to be constant; a key the
 * table does not define resolves to undefined at runtime and nothing is proven
 * about it: absent is not constant. A computed key — the caller's choice —
 * picks WHICH entry, never WHAT, so the lookup is constant when every entry
 * is. That second shape used to be a separate one-hop special case inside the
 * neutralisation check, which accepted any object or array literal without
 * looking at its values or at writes through it: `{ a: req.query.p }` and a
 * table patched with `T.a = input` both passed as a closed set.
 *
 * ## Why resolving the declaration is not enough
 *
 * A declaration prevents REBINDING at most, never MUTATION:
 *
 * ```js
 * const PATTERNS = { email: '^ok$' };
 * PATTERNS.email = req.body.pattern;   // legal, and the table is now theirs
 * new RegExp(PATTERNS.email);
 * ```
 *
 * So the binding must resolve to an object literal AND nothing in the file may
 * write through it. The write can be anywhere — a config loader patching the
 * table at startup is the realistic shape, not an assignment two lines above
 * the use — so every reference is checked, not just the ones nearby.
 */
function isConstantTableLookup(
  node: TSESTree.MemberExpression,
  sourceCode: TSESLint.SourceCode,
  depth: number,
): boolean {
  // `P['email']` is `P.email` spelled with brackets and reads one entry; a key
  // with no static name chooses among all of them.
  const value =
    propertyName(node) !== null
      ? resolveLookup(node, sourceCode)
      : tableOf(node.object, sourceCode);
  return value !== null && isBuildTimeConstant(value, sourceCode, depth + 1);
}

/** `{ … } as const` and `<const>{ … }` are annotations; the value is underneath. */
function withoutTypeAnnotation(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  while (
    current.type === 'TSAsExpression' ||
    current.type === 'TSTypeAssertion'
  ) {
    current = current.expression;
  }
  return current;
}

/**
 * The table an object position names: a binding nothing writes through, or an
 * entry of one (`P.user`). Recursion is over `node.object`, a strict subtree,
 * so it ends with the expression; the walk's depth bound is for bindings that
 * lead back to themselves, and is applied by `isBuildTimeConstant`.
 */
function tableOf(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): TSESTree.Node | null {
  if (node.type === 'Identifier') {
    return constObjectBinding(node, sourceCode);
  }
  return node.type === 'MemberExpression'
    ? resolveLookup(node, sourceCode)
    : null;
}

/**
 * The value a chain of named lookups names, or null.
 *
 * Recursive, so `P.user.email` costs no more code than `P.email` — an earlier
 * revision had a second near-identical resolver for exactly one extra level,
 * and the duplication showed up as uncovered lines in the copy.
 */
function resolveLookup(
  node: TSESTree.MemberExpression,
  sourceCode: TSESLint.SourceCode,
): TSESTree.Node | null {
  const name = propertyName(node);
  const table = name === null ? null : tableOf(node.object, sourceCode);
  if (table === null) {
    return null;
  }
  const unwrapped = withoutTypeAnnotation(table);
  if (unwrapped.type !== 'ObjectExpression') {
    return null;
  }
  // `{ 'email': … }` and `{ email: … }` define the same entry.
  const match = unwrapped.properties.find(
    (property): property is TSESTree.Property =>
      property.type === 'Property' && objectKeyName(property) === name,
  );
  return match === undefined ? null : (match.value as TSESTree.Node);
}

/** The initialiser of a binding that is written once and never written through. */
function constObjectBinding(
  node: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
): TSESTree.Node | null {
  const variable = resolveVariable(node.name, sourceCode.getScope(node));
  const definition = variable?.defs[0];
  if (variable === null || definition?.type !== 'Variable') {
    return null;
  }
  // The keyword is not the question, the writes are: a `let` table nothing
  // rebinds holds what it was declared with, and a `var` declared twice holds
  // whichever ran last. Exactly one write — the declaration's own — is the
  // table this file wrote. (`let P; P = {…}` has one write and no initialiser,
  // and resolves to nothing.)
  const writes = variable.references.filter((reference) => reference.isWrite());
  return writes.length === 1 && !isMutatedThroughAnyReference(variable)
    ? definition.node.init
    : null;
}

/** Is any reference to this binding the object of a write target? */
function isMutatedThroughAnyReference(
  variable: TSESLint.Scope.Variable,
): boolean {
  return variable.references.some((reference) => {
    let current: TSESTree.Node = reference.identifier;
    let parent = current.parent;
    while (parent?.type === 'MemberExpression' && parent.object === current) {
      current = parent;
      parent = parent.parent;
    }
    // A bare reference that writes — `P = …`, `[P] = …`, `for (P of …)` — is
    // a write to the BINDING, which the caller has already counted; here it
    // reaches `isWriteTarget` and says the same thing.
    return isWriteTarget(current);
  });
}

/**
 * Does the program write to this member expression?
 *
 * Assignment, `++`/`--` and `delete` were checked; destructuring and loop
 * heads were not, so `[T.a] = req.body.list`, `({ a: T.a } = req.body)` and
 * `for (T.a of req.body.list)` each put attacker data into a table this rule
 * then trusted. A member expression can only appear inside a pattern when the
 * pattern is an assignment target — `const [T.a] = …` is a syntax error — so
 * reaching a pattern is already proof of a write.
 */
function isWriteTarget(node: TSESTree.Node): boolean {
  const parent = node.parent;
  switch (parent?.type) {
    case 'AssignmentExpression':
    case 'ForInStatement':
    case 'ForOfStatement':
      return parent.left === node;
    case 'UpdateExpression':
    case 'ArrayPattern':
    case 'RestElement':
      return true;
    case 'UnaryExpression':
      return parent.operator === 'delete';
    case 'AssignmentPattern':
      return parent.left === node;
    case 'Property':
      return parent.value === node && parent.parent.type === 'ObjectPattern';
    default:
      return false;
  }
}

/** Resolve an identifier to its declaration and judge every write to it. */
function isConstantBinding(
  node: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
  depth: number,
): boolean {
  const variable = resolveVariable(node.name, sourceCode.getScope(node));
  // A parameter, an import, a function or an undeclared global is not a value
  // this file writes. A second declaration of a `var` is just another write,
  // and every write is judged below.
  const definition = variable?.defs[0];
  if (variable === null || definition?.type !== 'Variable') {
    return false;
  }

  // A `for (let i = 0; …)` counter is driven by the loop, not by input.
  if (definition.parent.parent.type === 'ForStatement') {
    return true;
  }

  // `for (const source of REDACTION_SOURCES)` — the binding carries no
  // initialiser of its own, and the old check read `declarator.init`, found
  // `null` and gave up. Scope analysis records the ITERABLE as that write's
  // expression, so the write check below judges it — a module constant of
  // literals is as fixed as the `CONST_ARRAY.join('|')` shape already cleared,
  // and `for (const key in TABLE)` is the same fact about the table's keys.

  // The declaration KEYWORD was the old test, and it is the wrong question.
  // `let source = '^\d+$'; if (mode === 'word') source = '^\w+$';` can only ever
  // hold one of the strings written in this file — the set of values is closed
  // whatever the keyword says. What matters is that every write is itself
  // build-time constant: the initialiser when there is one, and every later
  // assignment — `let source; if (word) source = '^\w+$'; else source = '^\d+$'`
  // is the same closed set written without one.
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
    return (
      written != null && isBuildTimeConstant(written, sourceCode, depth + 1)
    );
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
  const [patternArg] = node.arguments;
  if (
    patternArg?.type !== 'MemberExpression' ||
    propertyName(patternArg) !== 'source'
  ) {
    return false;
  }

  const receiver = patternArg.object;

  // Only ONE thing qualifies: the receiver resolves, in this file, to a regular
  // expression. Then it is a RegExp because the program says so, and the copy
  // compiles to what the original compiles to.
  //
  // An earlier revision also accepted `new RegExp(X.source, X.flags)` — the same
  // receiver supplying both accessors — on the grounds that it is the clone
  // idiom. An adversarial wave killed it:
  //
  //     const o = { source: req.query.p, flags: 'g' };
  //     new RegExp(o.source, o.flags);            // exempted. attacker-chosen.
  //     const o = JSON.parse(body);
  //     new RegExp(o.source, o.flags);            // exempted. attacker-chosen.
  //
  // Any object may carry `.source` and `.flags`; the pair is an idiom, not a
  // type. Structurally it is indistinguishable from mongoose's
  // `cloneRegExp(regexp)`, so the condition could not tell a clone from parsed
  // request data and let the second through.
  //
  // The message the rule now reports is what settles it. It says the pattern is
  // decided at runtime and its cost and origin are NOT VISIBLE HERE — and the
  // origin of `a.source`, for an `a` this file never sees, is exactly that:
  // not visible. Exempting it contradicted the finding's own words.
  //
  // Cost, measured: mongoose's `clone.js` and webpack's two sites bind their
  // receiver to a parameter and report again. n8n's `PLACEHOLDER_REGEX.source`
  // resolves to a literal in the file and stays exempt. Recall bought back at
  // the price of three findings, and the three are honest ones.

  // (2) The receiver resolves to a regular expression in this file.
  if (receiver.type !== 'Identifier') {
    return false;
  }
  const variable = resolveVariable(
    receiver.name,
    sourceCode.getScope(receiver),
  );
  const def = variable?.defs.length === 1 ? variable.defs[0] : null;
  if (!def || def.type !== 'Variable') {
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

/**
 * Every character that changes what a pattern matches. An escape has to cover
 * all of them: lodash `escapeRegExp`, `escape-string-regexp` and MDN's
 * `escapeRegExp` each list exactly these fourteen.
 */
const PATTERN_METACHARACTERS = '\\^$.*+?()[]{}|';

/**
 * `replaceAll` with a global regex replaces exactly what `replace` with it
 * does (and throws on a non-global one), so both spell the escape.
 */
const ESCAPING_METHODS: ReadonlySet<string> = new Set([
  'replace',
  'replaceAll',
]);

/**
 * `raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` — the escape idiom, recognised by
 * what the search CAN match, never by the name of a wrapper.
 *
 * The old test accepted any character class holding ONE metacharacter, and no
 * flag. Measured with `(a+)+$` against 27 `a`s and a `!`: raw 5,595 ms;
 * `.replace(/[.]/g, …)` leaves it intact, 1,314 ms; the full class without `g`
 * escapes only the first match, so `.(a+)+$` keeps its quantifiers, 2,779 ms;
 * the full class with `g`, 0.0 ms. So: a single, non-negated class naming
 * every metacharacter, applied globally.
 */
function escapesEveryMetacharacter(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (
    node.type !== 'CallExpression' ||
    node.callee.type !== 'MemberExpression' ||
    !namesOneOf(propertyName(node.callee), ESCAPING_METHODS)
  ) {
    return false;
  }
  const [argument] = node.arguments;
  // lodash's own escapeRegExp holds the search in a module constant and
  // replaces through it: a binding written once, never written through, is
  // the regex it was declared with.
  const search =
    argument?.type === 'Identifier'
      ? constObjectBinding(argument, sourceCode)
      : argument;
  if (search?.type !== 'Literal' || !('regex' in search)) {
    return false;
  }
  const { pattern, flags } = search.regex;
  const members = /^\[(?!\^)((?:\\.|[^\\\]])*)\]$/
    .exec(pattern)?.[1]
    ?.replace(/\\(.)/g, '$1');
  return (
    flags.includes('g') &&
    members !== undefined &&
    [...PATTERN_METACHARACTERS].every((character) =>
      members.includes(character),
    )
  );
}

/**
 * The length `maxPatternLength` is compared against.
 *
 * A written-out pattern — a string literal or a template with no
 * substitutions — is measured by the string it compiles from, so
 * `"x".repeat(100)` written out is 100 whether it is quoted or backticked. The
 * template arm used to read `Literal.value`, which a template does not have,
 * and measured every template as `"undefined".length` — nine — however long it
 * was. Anything else (a const binding, an escaped value) has no string at the
 * call site, and is measured by its source text, as before.
 */
function patternLength(
  patternNode: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): number {
  const literal = staticString(patternNode);
  return literal !== null
    ? literal.length
    : sourceCode.getText(patternNode).length;
}

export const detectNonLiteralRegexp = createRule<RuleOptions, MessageIds>({
  name: 'detect-non-literal-regexp',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/detect-non-literal-regexp.md',
      description:
        'Detects RegExp(variable), which might allow an attacker to DOS your server with a long-running regular expression',
      cwe: 'CWE-400',
    },
    messages: {
      // 🎯 Token optimization: 41% reduction (51→30 tokens) - compact template variables
      // Says what the check ESTABLISHED — the pattern is decided at runtime —
      // and not what it would like to have established. Every one of this
      // rule's 245 findings over 20 repositories used to read "ReDoS
      // vulnerability detected", a property of an automaton that a syntax check
      // cannot decide and that `no-redos-vulnerable-regex` decides with an
      // oracle. Locked by states-what-it-proves.lock.test.ts.
      //
      // CWE-400 stays because it is why a runtime-decided pattern is worth
      // surfacing at all; the description is what keeps it a pointer to the
      // risk rather than a claim to have found it.
      runtimeDecidedPattern: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Regex pattern decided at runtime',
        cwe: 'CWE-400',
        // `issueName` is not rendered into the final template, so the
        // established fact has to lead the DESCRIPTION or it reaches no reader.
        // Kept under the §C3 budget: the first honest wording measured 121
        // tokens against a ceiling of 120. Naming the two rules that DO decide
        // is what makes a "cannot tell" finding actionable, so the prose around
        // them was cut instead of the pointers.
        description:
          'Pattern decided at runtime, not visible here. Backtracking: no-redos-vulnerable-regex. Untrusted input: no-unsafe-regex-construction',
        severity: '{{riskLevel}}',
        // §C2.4 — names the safe shapes so a reader can close the finding.
        fix: '{{safeAlternative}} — Not a finding when the pattern is a module constant, a closed-set lookup, or escaped before construction',
        documentationLink:
          'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS',
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
              "Allow literal string regex patterns — `new RegExp('^[a-z]+$')`. " +
              'A rule named "non-literal" reporting a literal by default contradicted ' +
              'its own contract. Set false to prefer `/…/` literal syntax; measured ' +
              'effect on the 30-fixture corpus: +6 findings, all on safe/ files.',
          },
          maxPatternLength: {
            type: 'number',
            default: 100,
            minimum: 1,
            description: 'Maximum allowed pattern length for dynamic regex',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  skipTestFiles: true, // §B1 — independent of the harness
  defaultOptions: [
    {
      allowLiterals: true,
      maxPatternLength: 100,
    },
  ],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let allowLiterals: boolean;
    let maxPatternLength: number;
    // Severity is constant, and that is the honest state of it.
    //
    // A `determineRiskLevel` used to escalate to CRITICAL, and exactly one
    // thing ever produced that: the REGEXP_PATTERNS entry that matched `**`,
    // `++` or `??` as TEXT in the printed source. With the table gone nothing
    // reaches it, so the function collapsed to a constant — which is what it
    // always was for every finding the rule can still justify.
    //
    // The report used to carry `pattern`, `vulnerability`, `steps` and
    // `effort` too, built by a `detectVulnerability` table and a
    // `generateRefactoringSteps` helper. The message renders `{{riskLevel}}`
    // and `{{safeAlternative}}` and nothing else, so all of it reached no
    // reader; what survives is the one fact the two arms differ in.
    const RISK_LEVEL = 'HIGH';

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
     * allow decision matches everything, verified. That guard lives in
     * `isConstantTableLookup` now, where the table's values and every write
     * through it are checked; this one accepted any literal table.
     */
    const isNeutralised = (patternNode: TSESTree.Node): boolean => {
      if (escapesEveryMetacharacter(patternNode, context.sourceCode))
        return true;
      // Follow ONE binding hop: `const safe = raw.replace(...); new RegExp(safe)`.
      // Every write has to be an escape — a binding escaped where it is
      // declared and reassigned later no longer holds the escaped value, and
      // `let safe; safe = raw.replace(...)` is the same escape written later.
      if (patternNode.type !== 'Identifier') return false;
      const variable = resolveVariable(
        patternNode.name,
        context.sourceCode.getScope(patternNode),
      );
      return (
        variable?.defs[0]?.type === 'Variable' &&
        variable.references.every(
          (reference) =>
            !reference.isWrite() ||
            (reference.writeExpr != null &&
              escapesEveryMetacharacter(
                reference.writeExpr,
                context.sourceCode,
              )),
        )
      );
    };

    /**
     * Check RegExp constructor calls for vulnerabilities
     */
    const checkRegExpCall = (
      node: TSESTree.CallExpression | TSESTree.NewExpression,
    ) => {
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

      // First argument is the pattern. `new RegExp()` has none: it compiles
      // the empty pattern `(?:)`, which no one wrote and no one can steer.
      const [patternNode] = node.arguments;
      if (patternNode === undefined) {
        return;
      }

      // "Dynamic" means an attacker can change the pattern, not that it is spelled
      // as something other than a literal. `const source = 'ab+c'; new RegExp(source)`
      // is fixed at build time — a case eslint-plugin-security's own corpus marks
      // valid, and one we reported. `isStaticExpression` follows const bindings,
      // template parts and concatenation through ESLint's scope analysis.
      const isDynamic =
        !isStaticExpression({
          node: patternNode,
          scope: context.sourceCode.getScope(patternNode),
        }) && !isNeutralised(patternNode);

      if (isDynamic) {
        // The pattern is built, but the program decides every part of it —
        // a loop counter, a module constant, `CONST_ARRAY.join('|')`. Nothing
        // outside the process can change what this compiles to.
        if (isBuildTimeConstant(patternNode, context.sourceCode)) {
          return;
        }
      } else if (
        allowLiterals &&
        patternLength(patternNode, context.sourceCode) <= maxPatternLength
      ) {
        return;
      }

      context.report({
        node,
        messageId: 'runtimeDecidedPattern',
        data: {
          riskLevel: RISK_LEVEL,
          // A literal pattern is not a *non-literal* regexp. It only reaches
          // here when `allowLiterals` is off (or the literal is over
          // `maxPatternLength`), i.e. the user asked to be told about
          // `new RegExp('…')` in favour of `/…/` syntax. ReDoS inside a
          // literal is `no-redos-vulnerable-regex`'s remit.
          safeAlternative: isDynamic
            ? 'Pre-defined RegExp constants'
            : 'Regex literal syntax',
        },
      });
    };

    return {
      before() {
        const options = context.options[0] || {};
        // `options` is always an object here (defaulted just above), so a
        // second `|| {}` fallback could never fire — removed as dead code.
        ({ allowLiterals = true, maxPatternLength = 100 } = options);
      },
      // Reflect.construct(RegExp, [...]) is normalised to the direct shape
      // before the check runs, so one code path handles both spellings.
      CallExpression: (node: TSESTree.CallExpression) =>
        checkRegExpCall(asDirectConstruction(node, context.sourceCode)),
      NewExpression: checkRegExpCall,
    };
  },
});

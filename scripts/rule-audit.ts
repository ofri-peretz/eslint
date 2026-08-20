/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A defect taxonomy for machine-authored static-analysis rules, and the checks
 * that detect each class.
 *
 * WHY THIS FILE EXISTS
 *
 * On 2026-08-16 this repo's own ledger asserted "16 rules DECIDE BY NAME —
 * false positives ship to users". Sixteen rules were then probed with benign
 * snippets whose ONLY trigger was a matching identifier. Every one stayed
 * quiet. The claim was false, and it was false for a structural reason: the
 * ledger inferred a DEFECT from the PRESENCE OF A PATTERN.
 *
 * That is the same error the rules themselves are criticised for — deciding by
 * shape instead of by evidence — committed one level up, by the tool that
 * audits them. So this catalogue makes the distinction load-bearing:
 *
 *   DEFECT  a fact about the artifact. Countable, falsifiable by reading the
 *           file, and true regardless of runtime behaviour. "Zero valid cases"
 *           is a defect: the suite either has them or it does not.
 *
 *   SMELL   a pattern that CO-OCCURS with a defect class and cannot confirm one.
 *           A smell names the probe that would settle it. It must never be
 *           counted, summarised, or reported as a defect, and a rule carrying
 *           only smells is NOT "known broken" — it is unproven either way.
 *
 * If you add a check, decide which tier it belongs to by asking: could a
 * competent engineer read the rule, agree the pattern is there, and still be
 * right that nothing is wrong? If yes, it is a SMELL. Most static heuristics
 * about semantics are smells. Almost everything about tests and metadata is a
 * defect, because those are claims about artifacts, not about behaviour.
 *
 * WHAT IT CANNOT SEE
 *
 * No check here proves a rule is CORRECT. A rule can pass every check and still
 * be wrong: this repo has shipped a suite that asserted a false positive as
 * expected behaviour (`display-name`, which reported every named component in
 * every React codebase, with green tests). Coverage is not correctness.
 * Behavioural yield — does the rule fire on real code, and only where it should
 * — is measured by the benchmark suites, not here.
 */
import fs from 'node:fs';
import path from 'node:path';

export type Tier = 'defect' | 'smell';

export type Category =
  | 'detection-soundness'
  | 'test-adequacy'
  | 'measurement'
  | 'metadata-contract'
  | 'placement'
  | 'performance';

export interface Finding {
  /** Stable slug, safe to grep and to track across runs. */
  id: string;
  tier: Tier;
  category: Category;
  /** What is wrong, in one line. */
  detail: string;
  /** For a smell: the observation that would confirm or kill it. */
  probe?: string;
}

/** What a check gets to look at. Everything is derived; nothing is hand-entered. */
export interface RuleFacts {
  plugin: string;
  rule: string;
  /** Rule source, verbatim. */
  source: string;
  /** Rule source with comments removed — use this for every pattern detector. */
  code: string;
  /** Concatenated *.test.ts beside the rule. */
  tests: string;
  /** Test source with comments removed. */
  testCode: string;
  /** Body of `create(...)` only, comments removed. Where reporting happens. */
  createBody: string;
  /** The `meta` object literal, comments removed. */
  metaBlock: string;
  /**
   * Constants declared `@protocol-constant <reason>` — a fixed API surface, not
   * a tunable vocabulary. Resolved from the RAW source, because `code` has had
   * its comments stripped and the tag with them.
   */
  protocolConstants: Set<string>;
  /**
   * `src/utils/*` files this rule imports, one hop, comments stripped in `code`.
   * `reachable` is the constants the rule can actually get to through the
   * bindings it imports — see reachableConstants.
   */
  utils: { file: string; raw: string; code: string; reachable: Set<string> }[];
  validCases: number;
  invalidCases: number;
  cwe: string;
  corpusVulnerable: number;
  /** From scripts/lint-name-inference.ts. */
  nameDebt: 'report' | 'suppress' | null;
  /** Sibling rules in the same plugin, for overlap checks. */
  siblings: { rule: string; cwe: string; selectors: string[] }[];
  /**
   * Contents of every `*partition*.test.ts` in the plugin. A committed matrix
   * asserting exactly one report per shape IS `duplicate-coverage`'s own probe,
   * so it settles that smell — see the check.
   */
  partitionMatrices: string[];
  selectors: string[];
  /** docs/rules/<rule>.md exists. */
  hasDocPage: boolean;
}

/**
 * Strip comments before pattern-matching.
 *
 * These rules are heavily commented, and the comments quote the very shapes the
 * detectors look for — `no-innerhtml`'s header explains why it does NOT scan
 * text, using the words it would be flagged for. Detecting on raw source would
 * flag a rule for describing the defect it avoids, which is how a linter earns
 * the reputation these rules exist to avoid.
 *
 * String literals are preserved: a rule's word lists live in them and are real
 * evidence. Only `//` and block comments go.
 */
/**
 * Blank the CONTENTS of string and template literals, keeping their delimiters.
 *
 * `unconfigurable-vocabulary` scans for `const NAME = [...]`, and `stripComments`
 * deliberately preserves strings because word lists live in them. The result was
 * that a declaration quoted INSIDE a string counted as a declaration:
 * `detect-object-injection` carries `good: 'const ALLOWED_KEYS = [\'name\'…]'` as
 * documentation, and the audit charged the rule with a constant that does not
 * exist — unfixable by definition, since there is nothing there to tag or
 * configure.
 *
 * That is the audit deciding on PRINTED SOURCE, which is the exact defect its own
 * `textual-matching` check reports on rules. A checker that commits the fault it
 * polices has no standing, so the vocabulary scan runs over this instead.
 *
 * Delimiters survive so the `>= 6 quote characters` heuristic still counts the
 * entries of a REAL list.
 */
export function blankStringContents(src: string): string {
  let out = '';
  let i = 0;
  let quote: string | null = null;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      if (c === '\\') {
        out += ' ';
        i += 2;
        continue;
      }
      if (c === quote) {
        quote = null;
        out += c;
      } else {
        out += c === '\n' ? '\n' : ' ';
      }
      i++;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      quote = c;
      out += c;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

export function stripComments(src: string): string {
  let out = '';
  let i = 0;
  let quote: string | null = null;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (quote) {
      if (c === '\\') {
        out += c + (next ?? '');
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      out += c;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      out += c;
      i++;
      continue;
    }
    if (c === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** Extract a balanced `{...}` block that follows `label` (e.g. `meta:`). */
export function balancedBlock(src: string, label: RegExp, open = '{', close = '}'): string {
  const m = label.exec(src);
  if (!m) return '';
  let i = src.indexOf(open, m.index + m[0].length - 1);
  if (i === -1) return '';
  let depth = 0;
  const start = i;
  for (; i < src.length; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close) {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return src.slice(start);
}

/**
 * The body of `create(...)`, skipping its parameter list.
 *
 * `balancedBlock(code, /create\s*\(/)` cannot do this: it takes the first `{`
 * after the label, and every rule here is declared
 * `create(context: RuleContext<…>, [options = {}])` — so the first `{` is the
 * default-value literal, and the "body" came back as the two characters `{}`.
 *
 * The consequence was silent and total. Every check reading createBody — orphan
 * messages, fixers, textual matching, recursion — was inspecting an empty
 * string, so `orphan-message` fired for 70 rules whose messageIds are all
 * reported perfectly well, and the performance checks could never fire at all.
 * Two separate bugs in this one accessor produced two different false epidemics.
 */
function createBody(code: string): string {
  // Anchored to line start at method indentation. An unanchored `\bcreate\s*\(`
  // matches `Object.create(null)` inside a remediation STRING — `stripComments`
  // deliberately keeps string literals, because rule vocabularies live in them —
  // and `detect-object-injection` mentions exactly that in its advice text. The
  // extractor then returned the tail of a doc string as "the rule body", and
  // every messageId it genuinely reports was declared orphaned.
  const m = /^\s{0,4}create\s*\(/m.exec(code);
  if (!m) return '';
  let i = m.index + m[0].length - 1;
  let depth = 0;
  for (; i < code.length; i++) {
    if (code[i] === '(') depth++;
    else if (code[i] === ')') {
      depth--;
      if (depth === 0) break;
    }
  }
  const brace = code.indexOf('{', i);
  return brace === -1 ? '' : balancedBlock(code.slice(brace), /^/);
}

/** A reason shorter than this is a silencer wearing a tag. */
const PROTOCOL_CONSTANT_MIN_REASON = 24;

/**
 * The `src/utils/*` files a rule imports, read alongside it.
 *
 * Without this the audit reads `src/rules/<rule>/index.ts` and nothing else, and
 * **moving a word list one directory over cleared `unconfigurable-vocabulary`
 * for free.** That is worse than a missed finding: the gate reported the rule as
 * FIXED while the debt was merely relocated, so the ratchet recorded a repair
 * that had not happened. It was caught on `no-eval`, whose sink lists moved to
 * `src/utils/dynamic-code-sinks.ts` and whose finding vanished with them.
 *
 * It is the same hole in a second gate: `lint:name-inference` was defeated by
 * moving the match behind a helper, this one by moving the list into a util. A
 * per-rule checker cannot see cross-rule code, and cross-rule code is where the
 * shared assumptions live — so it is exactly where a wrong one does most damage.
 *
 * One hop only, and only within the plugin. A util's own imports are somebody
 * else's subject; following them would attribute a devkit finding to all 121
 * rules at once, which is noise rather than a brain per rule.
 */
function importedUtilSources(
  ruleDir: string,
): { file: string; raw: string; code: string; reachable: Set<string> }[] {
  const out: { file: string; raw: string; code: string; reachable: Set<string> }[] = [];
  const index = path.join(ruleDir, 'index.ts');
  if (!fs.existsSync(index)) return out;
  const src = fs.readFileSync(index, 'utf8');
  const seen = new Set<string>();
  for (const m of src.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*'((?:\.\.?\/)+utils\/[\w./-]+)'/g)) {
    const specifiers = m[1]
      .split(',')
      .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    for (const candidate of [`${m[2]}.ts`, path.join(m[2], 'index.ts')]) {
      const resolved = path.resolve(ruleDir, candidate);
      if (seen.has(resolved) || !fs.existsSync(resolved)) continue;
      seen.add(resolved);
      const raw = fs.readFileSync(resolved, 'utf8');
      const code = stripComments(raw);
      out.push({ file: path.basename(resolved), raw, code, reachable: reachableConstants(code, specifiers) });
      break;
    }
  }
  return out;
}

/**
 * SCREAMING_CASE constants a rule can actually reach through the bindings it imports.
 *
 * Without this the audit charged a rule with every constant in every util it
 * imported, which is a different wrong answer from the one it replaced:
 * `require-cookie-secure-attrs` imports three cookie-text helpers and was billed
 * for four credential vocabularies it never consults. Acting on that would have
 * added an option for a list the rule does not read — dishonest configuration
 * surface, and worse than the smell it was meant to fix, because a real option
 * that changes nothing is a promise to the consumer that we do not keep.
 *
 * So: start from the imported specifiers, walk to the top-level functions they
 * name, and follow calls to other top-level functions in the same file. Whatever
 * constants that closure mentions are reachable; the rest belong to somebody else.
 * `seen` bounds it — these utils call each other in cycles.
 */
export function reachableConstants(utilCode: string, specifiers: string[]): Set<string> {
  const bodies = new Map<string, string>();
  for (const m of utilCode.matchAll(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*[(<]/g)) {
    bodies.set(m[1], balancedBlock(utilCode.slice(m.index ?? 0), /\{/));
  }
  for (const m of utilCode.matchAll(/(?:export\s+)?const\s+(\w+)\s*(?::[^=]+)?=\s*(?:async\s*)?\(/g)) {
    if (!bodies.has(m[1])) bodies.set(m[1], utilCode.slice(m.index ?? 0, (m.index ?? 0) + 4000));
  }

  const constants = new Set<string>();
  const seen = new Set<string>();
  const queue = [...specifiers];
  while (queue.length) {
    const name = queue.shift() as string;
    if (seen.has(name)) continue;
    seen.add(name);
    const body = bodies.get(name);
    if (!body) continue;
    for (const ref of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
      const id = ref[1];
      if (/^[A-Z][A-Z0-9_]*$/.test(id)) constants.add(id);
      else if (bodies.has(id) && !seen.has(id)) queue.push(id);
    }
  }
  return constants;
}

/**
 * Names of constants declared `@protocol-constant <reason>` in the doc comment
 * DIRECTLY above them.
 *
 * Reads the RAW source, not `RuleFacts.code` — that one is `stripComments`ed, so
 * every tag is gone by the time a check runs. Resolving to NAMES rather than
 * offsets is what makes that safe: an offset into the stripped text does not
 * point at the same thing in the original.
 *
 * "Directly above" is load-bearing — only whitespace may sit between the comment
 * and the declaration, so a tag cannot drift onto the next constant down the
 * file. That is the difference between a claim about one list and a claim that
 * silently covers lists nobody reviewed.
 *
 * The reason is required. A bare `@protocol-constant` is precisely the silencer
 * `unconfigurable-vocabulary` exists to surface, so it does NOT clear the check:
 * the tag has to say why the set is a fixed API rather than a vocabulary, and a
 * reviewer reads that sentence in the diff that introduces it.
 */
export function protocolConstantNames(rawSource: string): Set<string> {
  const out = new Set<string>();
  for (const m of rawSource.matchAll(
    /\/\*\*([\s\S]*?)\*\/\s*(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*[:=]/g,
  )) {
    const tag = /@protocol-constant\b([\s\S]*?)(?=\n\s*\*\s*@\w|$)/.exec(m[1]);
    if (!tag) continue;
    const reason = tag[1].replace(/^\s*\*+/gm, ' ').replace(/\s+/g, ' ').trim();
    if (reason.length >= PROTOCOL_CONSTANT_MIN_REASON) out.add(m[2]);
  }
  return out;
}

/**
 * Keys at depth 1 of a `{...}` block — the block's own properties, not nested ones.
 *
 * Written after the naive version (`/^\s{4,}(\w+):/m`, indentation as a proxy for
 * depth) reported 120 of 121 rules as having "orphan messageIds". Every one was
 * a false positive: it was reading `icon`, `issueName`, `severity` and the rest
 * of the argument object inside `formatLLMMessage({...})`, which is what every
 * messageId in this ecosystem is defined by. A checker that flags ~100% of its
 * subjects has found a bug in itself, not an epidemic.
 */
export function topLevelKeys(block: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let i = 0;
  let quote: string | null = null;
  while (i < block.length) {
    const c = block[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      i++;
      continue;
    }
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') depth--;
    else if (depth === 1) {
      const m = /^(\w+)\s*:/.exec(block.slice(i));
      if (m && !/[\w$]/.test(block[i - 1] ?? '')) {
        out.push(m[1]);
        i += m[0].length;
        continue;
      }
    }
    i++;
  }
  return out;
}

/** Visitor keys from the object a rule's `create` returns. */
function visitorSelectors(createBody: string): string[] {
  const out = new Set<string>();
  // `Identifier(node) {`, `'CallExpression, NewExpression'(node) {`, `Program: () =>`
  const re = /(?:^|[{,\s])(?:(['"])([^'"]+)\1|([A-Z][A-Za-z]*(?::\w+)?))\s*(?:\(|:\s*(?:\(|function))/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(createBody)) !== null) {
    const raw = m[2] ?? m[3];
    if (!raw) continue;
    for (const part of raw.split(',')) {
      const s = part.trim();
      // Selectors start with an AST node type; helpers and options do not.
      if (/^[A-Z]/.test(s)) out.add(s);
    }
  }
  return [...out];
}

// ─────────────────────────────────────────────────────────────────────────────
// A. Detection soundness — is the verdict founded on evidence?
// ─────────────────────────────────────────────────────────────────────────────

function detectionSoundness(f: RuleFacts): Finding[] {
  const out: Finding[] = [];

  // Registered in scripts/lint-name-inference.ts. SMELL, not defect — see the
  // header. The registry records that a substring test EXISTS on a path, never
  // that it is the verdict. Sixteen `report` sites were probed and all sixteen
  // narrowed evidence that was already proven.
  if (f.nameDebt === 'report') {
    out.push({
      id: 'nominal-inference-report',
      tier: 'smell',
      category: 'detection-soundness',
      detail:
        'a name-substring test sits on a path that can report. If the spelling is ' +
        'the whole verdict this ships false positives; if it narrows an already-proven ' +
        'sink or taint root, it is sound and permitted.',
      probe:
        'lint a snippet that matches the vocabulary and nothing else ' +
        '(`const passwordLength = 8`). A report means the name decided.',
    });
  }
  if (f.nameDebt === 'suppress') {
    out.push({
      id: 'nominal-inference-suppress',
      tier: 'smell',
      category: 'detection-soundness',
      detail:
        'a name-substring test can silence a finding. Costs recall rather than trust — ' +
        'a false negative is invisible to the user, which is why it is triaged after reports.',
      probe: 'lint a genuine vulnerability whose identifier hits the allowlist vocabulary.',
    });
  }

  // The `no-innerhtml` shape: `sourceCode.getText(node)` then `.includes(name)`.
  // Printed source is not semantics — it matches inside comments, inside string
  // literals, and across an unrelated same-named binding in another scope.
  const textual =
    /getText\s*\([^)]*\)\s*\.\s*(includes|indexOf|match|search|startsWith|endsWith)\s*\(/.test(
      f.createBody,
    ) ||
    /\b(\w*[Tt]ext)\s*\.\s*(includes|indexOf|match)\s*\(/.test(f.createBody);
  if (textual) {
    out.push({
      id: 'textual-matching',
      tier: 'smell',
      category: 'detection-soundness',
      detail:
        'a decision is taken on PRINTED SOURCE rather than on the AST. Text matching ' +
        'cannot distinguish a call from the same words appearing in a string, a comment, ' +
        'or a different scope, and it silently follows formatting.',
      probe:
        'put the matched text in a string literal or a comment inside otherwise-clean ' +
        'code. A report proves the check reads text, not structure.',
    });
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// B. Test adequacy — has the rule been argued with?
// ─────────────────────────────────────────────────────────────────────────────

/** Below this, a suite has not explored the rule's own option and sink space. */
const THIN_SUITE = 8;

function testAdequacy(f: RuleFacts): Finding[] {
  const out: Finding[] = [];

  if (f.invalidCases === 0) {
    out.push({
      id: 'no-positive-cases',
      tier: 'defect',
      category: 'test-adequacy',
      detail: 'no invalid cases — nothing asserts that this rule catches anything at all.',
    });
  }
  if (f.validCases === 0) {
    out.push({
      id: 'no-negative-cases',
      tier: 'defect',
      category: 'test-adequacy',
      detail:
        'no valid cases — nothing pins when the rule must stay QUIET. Every false ' +
        'positive this rule can produce is currently un-regressed.',
    });
  } else if (f.validCases + f.invalidCases < THIN_SUITE) {
    out.push({
      id: 'thin-suite',
      tier: 'defect',
      category: 'test-adequacy',
      detail: `${f.validCases + f.invalidCases} total cases (< ${THIN_SUITE}) — too few to have explored the sink and option space.`,
    });
  }

  // An option the user can set that no test ever sets. Its branch has never run.
  const schema = balancedBlock(f.metaBlock, /schema\s*:/, '[', ']');
  const declared = new Set(topLevelKeys(balancedBlock(schema, /properties\s*:/)));
  const unexercised = [...declared].filter((o) => !f.testCode.includes(o));
  if (unexercised.length) {
    out.push({
      id: 'unexercised-option',
      tier: 'defect',
      category: 'test-adequacy',
      detail: `option(s) never set by any test: ${unexercised.join(', ')} — those branches ship unexecuted.`,
    });
  }

  // A messageId the rule can emit that no test asserts. The user sees a string
  // nobody has read back.
  const messages = new Set(topLevelKeys(balancedBlock(f.metaBlock, /messages\s*:/)));
  const reported = new Set<string>();
  for (const m of f.createBody.matchAll(/messageId\s*:\s*['"](\w+)['"]/g)) reported.add(m[1]);
  for (const m of f.createBody.matchAll(/messageId\s*:\s*(\w+)\s*[,}]/g)) reported.add(m[1]);

  const dead = [...messages].filter((id) => !reported.has(id) && !f.createBody.includes(id));
  if (dead.length && messages.size) {
    out.push({
      id: 'orphan-message',
      tier: 'defect',
      category: 'metadata-contract',
      detail: `messageId(s) declared but never reported: ${dead.join(', ')} — dead metadata, or a report path that was lost.`,
    });
  }
  const unasserted = [...reported].filter((id) => !f.testCode.includes(id));
  if (unasserted.length) {
    out.push({
      id: 'unasserted-message',
      tier: 'defect',
      category: 'test-adequacy',
      detail: `messageId(s) the rule emits that no test asserts: ${unasserted.join(', ')}.`,
    });
  }

  // A fixer nobody has run. Autofix on a security rule rewrites user code; an
  // untested one rewrites it wrongly.
  // Must take a fixer parameter. A bare `/\bfix\s*(\(|:)/` also matches the
  // `fix:` key of a remediation message — `fix: 'Atomic group, possessive…'` in
  // no-redos-vulnerable-regex — which is human prose, not a code rewrite. That
  // spelling made the audit claim a rule "produces a fix but declares neither
  // fixable nor hasSuggestions — ESLint will throw", about a file containing no
  // fixer at all.
  //
  // The narrow spelling then failed the other way. `no-deprecated-buffer` writes
  // `{ fix: fixTo(node, callee, method) }` — a named FACTORY returning the fix
  // function — so `fix:` is followed by an identifier and the audit reported
  // `fixable-without-fixer` against a rule whose fixer works: verified live
  // through `verifyAndFix`, `new Buffer(1024)` -> `Buffer.alloc(1024)`. Extracting
  // that factory is what made the rule "gain" the check.
  //
  // So: a call (`fixTo(`) and a bare-parameter arrow (`fixer =>`) both count. A
  // prose value still does not — `fix: 'Atomic group…'` opens with a quote, and
  // `fix: null` is followed by neither `(` nor `=>`.
  const hasFixer = /\bfix\s*(?:\(\s*\w|:\s*(?:\(|function|async|\w+\s*\(|\w+\s*=>))/.test(f.createBody);
  const declaresFixable = /\bfixable\s*:/.test(f.metaBlock);
  if (declaresFixable && !hasFixer) {
    out.push({
      id: 'fixable-without-fixer',
      tier: 'defect',
      category: 'metadata-contract',
      detail: 'meta.fixable is declared but create() never returns a fix — editors offer a fix that does nothing.',
    });
  }
  if (hasFixer && !declaresFixable && !/hasSuggestions/.test(f.metaBlock)) {
    out.push({
      id: 'fixer-without-fixable',
      tier: 'defect',
      category: 'metadata-contract',
      detail: 'create() produces a fix but meta declares neither fixable nor hasSuggestions — ESLint will throw at runtime.',
    });
  }
  // `suggest: [{ messageId, fix: () => null }]`.
  //
  // PROBED, 2026-08-16, and the first wording of this finding was WRONG. It read
  // "the editor offers a Quick Fix that does nothing when selected". It does not:
  // ESLint's report translator DROPS any suggestion whose fix yields no edit, so
  // `linter.verify` returns the message with no `suggestions` array at all.
  //
  // What is actually wrong is quieter and still real. The rule declares
  // `hasSuggestions: true`, writes remediation text, and reserves a messageId for
  // advice that can never reach a single user. For plugins whose stated advantage
  // IS the quality of their remediation guidance, that guidance being unreachable
  // is a product gap, not a cosmetic one.
  //
  // Kept as a DEFECT because it is a fact about the artifact — `() => null`
  // returns no edit on every path — but stated as what the probe showed, not as
  // what the pattern suggested.
  const inert = (f.createBody.match(/\bfix\s*:\s*(?:\([^)]*\)|\w+)\s*=>\s*(?:null|\[\s*\]|undefined)/g) ?? []).length;
  if (inert) {
    out.push({
      id: 'inert-suggestion',
      tier: 'defect',
      category: 'metadata-contract',
      detail:
        `${inert} suggestion(s) with \`fix: () => null\`. ESLint discards these before ` +
        'they reach the user, so the remediation text attached to them is never shown ' +
        'and hasSuggestions overstates what the rule offers.',
    });
  }
  if (hasFixer && !inert && !/\boutput\s*:/.test(f.testCode) && !/suggestions\s*:/.test(f.testCode)) {
    out.push({
      id: 'untested-fixer',
      tier: 'defect',
      category: 'test-adequacy',
      detail: 'a fixer/suggestion exists but no test asserts its output — the rewrite it applies to user code is unverified.',
    });
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// C. Measurement — is the rule inside any published number?
// ─────────────────────────────────────────────────────────────────────────────

function measurement(f: RuleFacts): Finding[] {
  if (f.corpusVulnerable > 0) return [];
  return [
    {
      id: 'no-corpus-fixture',
      tier: 'defect',
      category: 'measurement',
      detail:
        `no benchmarks/corpus/${f.cwe}/ fixture — this rule contributes nothing to the ` +
        'published detection, false-positive or parity figures. Its real-world behaviour is unmeasured.',
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// D. Metadata contract — what the rule promises its consumers
// ─────────────────────────────────────────────────────────────────────────────

function metadataContract(f: RuleFacts): Finding[] {
  const out: Finding[] = [];

  if (f.cwe === '—') {
    out.push({
      id: 'missing-cwe',
      tier: 'defect',
      category: 'metadata-contract',
      detail: 'no CWE in meta.docs — the rule cannot appear in any CWE coverage claim, and its corpus fixture cannot be located.',
    });
  }
  if (!/\burl\s*:/.test(f.metaBlock)) {
    out.push({
      id: 'missing-docs-url',
      tier: 'defect',
      category: 'metadata-contract',
      detail: 'no meta.docs.url — the finding gives the user nowhere to go.',
    });
  }
  if (!f.hasDocPage) {
    out.push({
      id: 'no-doc-page',
      tier: 'defect',
      category: 'metadata-contract',
      detail: 'no docs/rules/<rule>.md — meta.docs.url, if present, is a 404.',
    });
  }

  // EVERY option must ship an explicit default, and every hard-coded vocabulary
  // must be reachable as an option — unless it is declared a protocol constant.
  //
  // Two failures live here, and the second is the expensive one:
  //
  //   1. A schema property with no `default`. The rule still has a behaviour
  //      when the option is unset — it is just written in the destructuring
  //      instead of the contract, so the documented default and the real one
  //      drift, and the generated docs cannot state what the rule does out of
  //      the box.
  //   2. A word list baked into the rule body with no option to override it.
  //      This is how `role` came to match `casserole` in a consumer's codebase
  //      with no way for them to turn it off short of disabling the rule. A
  //      heuristic the user cannot tune is a heuristic the user must accept
  //      whole — and every vocabulary is wrong for somebody's domain.
  const optSchema = balancedBlock(f.metaBlock, /schema\s*:/, '[', ']');
  const schemaProps = balancedBlock(optSchema, /properties\s*:/);
  const noDefault = topLevelKeys(schemaProps).filter((opt) => {
    const block = balancedBlock(schemaProps.slice(schemaProps.indexOf(`${opt}:`)), new RegExp(`^${opt}\\s*:`));
    return block && !/\bdefault\s*:/.test(block);
  });
  if (noDefault.length) {
    out.push({
      id: 'option-without-default',
      tier: 'defect',
      category: 'metadata-contract',
      detail: `option(s) with no explicit default in meta.schema: ${noDefault.join(', ')} — the real default lives only in the destructuring, so docs and behaviour drift.`,
    });
  }

  // A module-scope word list that no option feeds. Heuristic, so a SMELL: some
  // constant lists are genuine protocol facts (`RSA_PKCS1_PADDING`), not tunable
  // vocabulary.
  //
  // That distinction had no way to be EXPRESSED, and the gap was expensive. The
  // check's only clearing condition is textual — the name appears in the schema,
  // or is reassigned in `create()` — so the sole way to silence it was to make
  // the list configurable. For `CIPHERIV_FACTORIES`, `CACHE_WRITE_METHODS` or
  // ldapjs's `SEARCH_METHODS` that is the WRONG answer twice over: it lets a
  // consumer delete the entries the rule exists to find (silencing it on exactly
  // the shapes it was written for), and for a call-signature set it lets them
  // re-assert the false positive the set was created to close. The alternative,
  // baselining, buries the finding permanently.
  //
  // So a declaration may carry `@protocol-constant <reason>` in the doc comment
  // DIRECTLY above it. This is deliberately not an entry in this file: annotating
  // the gate to look past a site is the evasion CLAUDE.md names, and it hides the
  // claim from the diff that introduces it. At the site, a reviewer sees the
  // justification next to the list. The reason is required and must be
  // substantive — a bare tag is a silencer, and silencers are what this check is
  // for.
  const VOCAB = /const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=]+)?=\s*(?:new Set\()?\[([^\]]{20,})\]/g;
  const named = (where: string) => (m: RegExpMatchArray) => ({ name: m[1], body: m[2], where });
  // Over blanked strings — see blankStringContents. A declaration quoted inside a
  // doc example is not a declaration, and charging a rule with one is unfixable:
  // there is nothing there to tag or to make configurable.
  const vocabularies = [
    ...[...blankStringContents(f.code).matchAll(VOCAB)].map(named('')),
    // Utils the rule imports — see importedUtilSources. Attributed to the file
    // they live in, because "make this configurable" is a different job in a
    // shared util than in one rule: the option has to be threaded from every
    // consumer, and naming the file is what makes that visible.
    ...f.utils.flatMap((u) =>
      [...blankStringContents(u.code).matchAll(VOCAB)]
        .filter((m) => u.reachable.has(m[1]))
        .map(named(` (${u.file})`)),
    ),
  ]
    .filter((v) => (v.body.match(/'/g) ?? []).length >= 6)
    .filter((v) => !f.protocolConstants.has(v.name))
    .filter((v) => !optSchema.includes(v.name) && !f.createBody.includes(`${v.name} =`))
    .map((v) => `${v.name}${v.where}`);
  const usesMembership = /includes\(|\.has\(|some\(/.test(f.createBody) || f.utils.length > 0;
  if (vocabularies.length && usesMembership) {
    out.push({
      id: 'unconfigurable-vocabulary',
      tier: 'smell',
      category: 'metadata-contract',
      detail: `word list(s) no option can override: ${vocabularies.join(', ')} — if these decide a report, a consumer whose domain uses those words has no remedy but disabling the rule.`,
      probe:
        'check whether the list feeds a report path, and whether any schema option ' +
        'extends or replaces it. A protocol constant is fine; a vocabulary of ' +
        'English words is not.',
    });
  }

  // Options read by create() that the schema does not declare. ESLint validates
  // user config against the schema, so the user is told their setting is
  // invalid while the code that reads it sits right there.
  const destructured = balancedBlock(f.createBody, /const\s*\{/);
  const read = new Set<string>();
  for (const m of destructured.matchAll(/(\w+)\s*(?:=[^,}]+)?[,}]/g)) read.add(m[1]);
  const schema = balancedBlock(f.metaBlock, /schema\s*:/, '[', ']');
  const undeclared = [...read].filter(
    (o) => o.length > 2 && !schema.includes(o) && /^(allow|report|trusted|ignore|max|min|enforce|require|check|detect|treat)/i.test(o),
  );
  if (undeclared.length && schema) {
    out.push({
      id: 'schema-drift',
      tier: 'defect',
      category: 'metadata-contract',
      detail: `option(s) read by create() but absent from meta.schema: ${undeclared.join(', ')} — ESLint rejects the user's config for a setting the rule honours.`,
    });
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// E. Placement — is the rule in the plugin a consumer would look in?
// ─────────────────────────────────────────────────────────────────────────────

/** Globals and modules that only exist on one side of the runtime split. */
const NODE_ONLY = /\b(child_process|require\(['"]fs|process\.env|__dirname|readFileSync|createServer)\b/;
const BROWSER_ONLY = /\b(document\.|window\.|localStorage|sessionStorage|navigator\.|innerHTML)\b/;

function placement(f: RuleFacts): Finding[] {
  const out: Finding[] = [];

  // Only meaningful for the two runtime-scoped plugins. `secure-coding` is
  // deliberately runtime-agnostic, so this check does not apply to it.
  const domain =
    f.plugin === 'browser-security' ? 'browser' : f.plugin === 'node-security' ? 'node' : null;
  if (domain === 'browser' && NODE_ONLY.test(f.createBody)) {
    out.push({
      id: 'cross-domain-api',
      tier: 'smell',
      category: 'placement',
      detail: 'a browser-security rule keys on Node-only APIs — either it is in the wrong plugin, or it fires on files that never reach a browser.',
      probe: 'check whether the sink can occur in code shipped to a browser at all.',
    });
  }
  if (domain === 'node' && BROWSER_ONLY.test(f.createBody)) {
    out.push({
      id: 'cross-domain-api',
      tier: 'smell',
      category: 'placement',
      detail: 'a node-security rule keys on DOM-only APIs — either it is in the wrong plugin, or the sink cannot occur on a server.',
      probe: 'check whether the sink can occur in code that runs under Node at all.',
    });
  }

  // Two rules, same CWE, same visitor keys: a user enabling the preset gets two
  // findings for one line and reads it as noise.
  const overlap = f.siblings.filter(
    (s) =>
      s.rule !== f.rule &&
      s.cwe === f.cwe &&
      f.cwe !== '—' &&
      s.selectors.some((sel) => f.selectors.includes(sel)),
  );
  // A PARTITION MATRIX settles it, because it IS this check's own probe, run and
  // committed. The smell is shape-based — same CWE, overlapping visitor keys —
  // and a correctly partitioned family trips it BY CONSTRUCTION: the storage
  // rules all carry CWE-922 and all visit CallExpression/AssignmentExpression,
  // and they were measured at 0 double reports across 93 fixtures × 7 rules.
  //
  // Recording that as accepted debt would have been worse than the smell: a
  // future reader would believe the partition does not exist, and the work that
  // built it would look undone. Baselining buries a finding; baselining a
  // REFUTED finding buries the refutation.
  //
  // So the escape is evidence, not annotation — a `*partition*.test.ts` in the
  // family that names this rule and asserts exactly one report per shape. Unlike
  // a doc tag it cannot go stale silently: if the partition breaks, the matrix
  // goes red before this check has to say anything.
  const settledByMatrix = f.partitionMatrices.some((m) => m.includes(f.rule));
  if (overlap.length && !settledByMatrix) {
    out.push({
      id: 'duplicate-coverage',
      tier: 'smell',
      category: 'placement',
      detail: `same CWE and overlapping visitor keys as: ${overlap.map((o) => o.rule).join(', ')} — a single line may produce two findings.`,
      probe:
        'lint one vulnerable fixture with both rules on and count the reports. If it is ' +
        'exactly one, commit that as a *partition*.test.ts naming both rules and this clears.',
    });
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// F. Performance — cost paid on every file, including clean ones
// ─────────────────────────────────────────────────────────────────────────────

function performance(f: RuleFacts): Finding[] {
  const out: Finding[] = [];

  // getText() with no node argument prints the ENTIRE file, per visit.
  if (/getText\s*\(\s*\)/.test(f.createBody)) {
    out.push({
      id: 'whole-program-text',
      tier: 'smell',
      category: 'performance',
      detail: 'sourceCode.getText() with no node prints the whole file. Inside a visitor this is O(file) per node.',
      probe: 'time the rule against a 5k-line file versus a 500-line one; cost should be linear, not quadratic.',
    });
  }

  // A regex built from a user option, applied to user code: the classic ReDoS
  // in the linter itself rather than in the code being linted.
  if (/new RegExp\s*\(\s*[^'")]/.test(f.createBody)) {
    out.push({
      id: 'dynamic-regexp',
      tier: 'smell',
      category: 'performance',
      detail: 'a RegExp is constructed from a non-literal — if the source is a user option, a pathological pattern hangs the lint run.',
      probe: 'set the option to a nested-quantifier pattern and lint a long identifier.',
    });
  }

  // Recursion over the AST with no visited-set and no depth bound. This repo has
  // already shipped one stack overflow from a cyclic binding chain.
  for (const m of f.createBody.matchAll(/function\s+(\w+)\s*\(([^)]*)\)/g)) {
    const [, name, params] = m;
    const body = balancedBlock(f.createBody.slice(m.index), new RegExp(`function\\s+${name}`));
    // A BARE call to itself. `body.includes(name + '(')` also matches a MEMBER
    // call that merely ends in the same word: every rule defines a local
    // `function report(node)` that calls `context.report({...})`, and the naive
    // test read that as infinite recursion in 25 rules.
    if (!new RegExp(`(?<![.\\w])${name}\\s*\\(`).test(body.slice(body.indexOf('{')))) continue;
    if (/\b(seen|visited|depth|budget)\b/.test(params)) continue;
    out.push({
      id: 'unguarded-recursion',
      tier: 'smell',
      category: 'performance',
      detail: `${name}() recurses with no visited-set or depth bound — a cyclic binding chain overflows the stack.`,
      probe: 'lint `let a = b; let b = a;` or a self-referential type and watch for RangeError.',
    });
    break;
  }

  return out;
}

/**
 * One generic line per check, for the index table.
 *
 * `Finding.detail` is deliberately rule-specific — it names the actual option,
 * messageId or sibling — so it cannot double as a column header. Summarising a
 * check by quoting the first matching rule's detail is how the index came to
 * describe `no-corpus-fixture` as "no benchmarks/corpus/CWE-400/ fixture".
 */
export const CHECK_SUMMARY: Record<string, string> = {
  'no-corpus-fixture': 'Rule is absent from the benchmark corpus, so no published figure measures it.',
  'inert-suggestion': 'Suggestion fix returns null; ESLint discards it and its remediation text never renders.',
  'unasserted-message': 'Rule emits a messageId that no test asserts.',
  'unexercised-option': 'A configurable option no test ever sets — the branch ships unexecuted.',
  'orphan-message': 'A messageId declared in meta that no code path reports.',
  'thin-suite': `Fewer than ${THIN_SUITE} total cases — the sink and option space is unexplored.`,
  'no-positive-cases': 'No invalid cases: nothing asserts the rule catches anything.',
  'no-negative-cases': 'No valid cases: every false positive it can produce is un-regressed.',
  'untested-fixer': 'A real fixer exists but no test asserts the code it writes.',
  'fixable-without-fixer': 'meta.fixable declared with no fix produced.',
  'fixer-without-fixable': 'A fix is produced without meta declaring fixable or hasSuggestions.',
  'missing-cwe': 'No CWE in meta.docs — excluded from CWE coverage claims.',
  'missing-docs-url': 'No meta.docs.url — the finding gives the reader nowhere to go.',
  'no-doc-page': 'No docs/rules/<rule>.md behind the documented URL.',
  'schema-drift': 'An option create() honours that meta.schema rejects.',
  'option-without-default': 'A schema option with no explicit default — docs and real behaviour drift.',
  'unconfigurable-vocabulary': 'A baked-in word list no option can override or extend.',
  'nominal-inference-report': 'A name-substring test on a reporting path. Sound if it narrows proven evidence; a false-positive source if it decides alone.',
  'nominal-inference-suppress': 'A name-substring test that can silence a finding. Costs recall.',
  'textual-matching': 'A decision taken on printed source rather than the AST.',
  'duplicate-coverage': 'Shares a CWE and visitor keys with a sibling — one line may yield two findings.',
  'cross-domain-api': 'Keys on APIs from the other runtime — possibly the wrong plugin.',
  'unguarded-recursion': 'Self-recursive walker with no visited-set or depth bound.',
  'dynamic-regexp': 'A RegExp built from a non-literal; a pathological option pattern stalls the run.',
  'whole-program-text': 'sourceCode.getText() with no node — prints the whole file per visit.',
};

const CHECKS = [detectionSoundness, testAdequacy, measurement, metadataContract, placement, performance];

export function auditRule(f: RuleFacts): Finding[] {
  return CHECKS.flatMap((c) => c(f));
}

/** Assemble RuleFacts for every rule in a plugin. */
export function collectFacts(
  packagesDir: string,
  plugin: string,
  extras: (rule: string, cwe: string) => { validCases: number; invalidCases: number; corpusVulnerable: number; nameDebt: 'report' | 'suppress' | null },
): RuleFacts[] {
  const pkg = path.join(packagesDir, `eslint-plugin-${plugin}`);
  const rulesDir = path.join(pkg, 'src', 'rules');
  if (!fs.existsSync(rulesDir)) return [];

  const raw = fs
    .readdirSync(rulesDir)
    .sort()
    .filter((r) => fs.existsSync(path.join(rulesDir, r, 'index.ts')))
    .map((rule) => {
      const dir = path.join(rulesDir, rule);
      const source = fs.readFileSync(path.join(dir, 'index.ts'), 'utf8');
      const code = stripComments(source);
      const tests = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.test.ts'))
        .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
        .join('\n');
      const metaBlock = balancedBlock(code, /meta\s*:/);
      const body = createBody(code);
      const cwe = /cwe:\s*'([^']+)'/.exec(code)?.[1] ?? '—';
      const utils = importedUtilSources(dir);
      return {
        plugin,
        rule,
        source,
        code,
        tests,
        testCode: stripComments(tests),
        metaBlock,
        createBody: body,
        utils,
        protocolConstants: new Set([
          ...protocolConstantNames(source),
          ...utils.flatMap((u) => [...protocolConstantNames(u.raw)]),
        ]),
        cwe,
        selectors: visitorSelectors(body),
        hasDocPage: fs.existsSync(path.join(pkg, 'docs', 'rules', `${rule}.md`)),
      };
    });

  const siblings = raw.map((r) => ({ rule: r.rule, cwe: r.cwe, selectors: r.selectors }));
  // Read once per plugin, not once per rule: a matrix lives in whichever rule's
  // directory its author picked, and it names every rule in the family.
  const partitionMatrices = fs
    .readdirSync(rulesDir)
    .flatMap((rule) => {
      const dir = path.join(rulesDir, rule);
      if (!fs.statSync(dir).isDirectory()) return [];
      return fs
        .readdirSync(dir)
        .filter((f) => /partition.*\.test\.ts$/.test(f))
        .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'));
    });
  return raw.map((r) => ({ ...r, siblings, partitionMatrices, ...extras(r.rule, r.cwe) }));
}

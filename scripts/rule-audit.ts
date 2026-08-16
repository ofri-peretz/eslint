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
  validCases: number;
  invalidCases: number;
  cwe: string;
  corpusVulnerable: number;
  /** From scripts/lint-name-inference.ts. */
  nameDebt: 'report' | 'suppress' | null;
  /** Sibling rules in the same plugin, for overlap checks. */
  siblings: { rule: string; cwe: string; selectors: string[] }[];
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
  const hasFixer = /\bfix\s*(?:\(\s*\w|:\s*(?:\(|function|async))/.test(f.createBody);
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
  // must be reachable as an option.
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
  const vocabularies = [...f.code.matchAll(/const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=]+)?=\s*(?:new Set\()?\[([^\]]{20,})\]/g)]
    .filter(([, , body]) => (body.match(/'/g) ?? []).length >= 6)
    .map(([, name]) => name)
    .filter((name) => !optSchema.includes(name) && !f.createBody.includes(`${name} =`));
  if (vocabularies.length && /includes\(|\.has\(|some\(/.test(f.createBody)) {
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
  if (overlap.length) {
    out.push({
      id: 'duplicate-coverage',
      tier: 'smell',
      category: 'placement',
      detail: `same CWE and overlapping visitor keys as: ${overlap.map((o) => o.rule).join(', ')} — a single line may produce two findings.`,
      probe: 'lint one vulnerable fixture with both rules on and count the reports.',
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
      return {
        plugin,
        rule,
        source,
        code,
        tests,
        testCode: stripComments(tests),
        metaBlock,
        createBody: body,
        cwe,
        selectors: visitorSelectors(body),
        hasDocPage: fs.existsSync(path.join(pkg, 'docs', 'rules', `${rule}.md`)),
      };
    });

  const siblings = raw.map((r) => ({ rule: r.rule, cwe: r.cwe, selectors: r.selectors }));
  return raw.map((r) => ({ ...r, siblings, ...extras(r.rule, r.cwe) }));
}

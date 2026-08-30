#!/usr/bin/env tsx

/**
 * lint-name-inference.ts — a name is not a type.
 *
 * The sibling of the AST-not-printed-source doctrine, and the systemic root
 * cause behind #504, #505, #506 and four already fixed (#490, #496, #500, and
 * the deprecated-rule removal in #468):
 *
 *   | rule                          | inferred from          | reality           |
 *   | no-timing-unsafe-compare      | a variable named token | compared to a literal |
 *   | jwt/no-decode-without-verify  | a method named decode  | a TOML parser     |
 *   | no-sensitive-data-exposure    | the word password      | English prose     |
 *   | detect-suspicious-dependencies| a name near react      | preact, a real package |
 *
 * WHAT THIS GATES, precisely: a SUBSTRING test against an identifier's
 * spelling. Not exact membership — `REQUEST_ROOTS.has(node.name)` matching
 * `req`/`request` is a naming convention with a century of Express behind it,
 * and treating it as a defect would flag two dozen rules that are fine.
 *
 * Substring is the different, sharper thing. `propName.includes('phone')`
 * matches `phoneBookLength`. `objectName.includes('app')` matches
 * `appleCount`. `name.includes('react')` matches `preact` — a real package,
 * which is the exact defect in the table above. The claim "this identifier
 * contains these letters, therefore it holds a secret" is not evidence, and
 * every entry in that table is an instance of it.
 *
 * DIRECTION MATTERS and the registry records it:
 *   - `report`  — a finding is raised because a name contains a word. A wrong
 *                 guess is a false positive shipped to a user's console.
 *   - `suppress`— a finding is withheld because a name contains a word
 *                 (`trustedLibraries.some(l => calleeName.includes(l))`). A
 *                 wrong guess is a false NEGATIVE, which is quieter and, per
 *                 the precision/recall work, the one we keep buying by
 *                 accident. Recorded rather than waved through.
 *
 * Detection is deliberately over-inclusive and the registry absorbs the
 * existing set with reasons, the same way GRANDFATHERED does in
 * lint-plugin-taxonomy.ts. The ratchet is the point: a rule NOT in the
 * registry that starts matching a name by substring fails the build, so this
 * class cannot arrive unnoticed again. A registry entry whose sites have all
 * gone is also a failure, so the debt list cannot rot after a fix.
 *
 * KNOWN BLIND SPOT: detection is intra-procedural. It tracks a binding whose
 * initializer mentions `.name`, so it sees `const n = node.name; n.includes('x')` but
 * not the same test split across two functions — `nameOf(node)` returning the name and
 * a second function testing the string it was handed. `eslint-plugin-node-security`'s
 * `utils/credential-evidence.ts` is exactly that shape: it decides a stored value is a
 * secret by matching credential words against a name, and this gate cannot see it. The
 * match is documented at its call site and in the two rules' docs instead. Closing this
 * means following values across functions, which is a different instrument.
 *
 * ponytail: file-level, not site-level. Line numbers churn on every edit and
 * a registry keyed to them would be wrong within a week. The cost is that
 * ADDING a second name-substring site to an already-registered rule does not
 * trip the gate — accepted, because the entry is already debt and already
 * names the rule for the audit.
 *
 * Usage:
 *   tsx scripts/lint-name-inference.ts           # exit non-zero on a new violation
 *   tsx scripts/lint-name-inference.ts --quiet   # only print on failure
 *   tsx scripts/lint-name-inference.ts --list    # print every site it can see
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import process from 'node:process';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');

/** Substring-ish string methods. `startsWith`/`endsWith` are anchored and excluded. */
const SUBSTRING_METHODS = 'includes|indexOf|search|match';

/**
 * `const varName = node.id.name…;` — a binding holding an identifier's spelling.
 * Captures the whole initializer, across lines, so the tokenisation check below
 * can see the entire chain.
 */
const NAME_BINDING = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?=([^;]*);)/g;

/**
 * A name that has been split into words is no longer a string — `.includes` on
 * it is Array.prototype.includes, which is EXACT element membership, not a
 * substring test. That distinction is the entire subject of this gate, so
 * getting it wrong here would be self-refuting.
 *
 * `no-sensitive-data-exposure` is the rule that forced this: it tokenises
 * `node.callee.name` on camelCase boundaries and then asks `words.includes('log')`,
 * with a comment noting that `login`, `logout`, `dialog`, `catalog` and `blog`
 * all contain "log" and none is a logger. That is the hardened form — the fix
 * for this defect class, not an instance of it. Flagging it would have told the
 * author to undo the correct thing.
 */
const TOKENISED = /\.split\(/;

/**
 * `const WORDS = ['password', 'token', …]` — a vocabulary of string literals.
 *
 * Four or more entries, because two or three literals are usually an enum or a
 * pair of method names; a list this long is a dictionary someone intends to
 * substring-match against an identifier.
 */
const WORD_LIST = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:new Set\()?\[\s*((?:'[^']*'|"[^"]*")\s*,\s*){3,}/g;

/** `x.name.includes(` / `x.name.toLowerCase().includes(` — the inline form. */
const INLINE_NAME_SUBSTRING = new RegExp(
  `\\.name(?:\\.toLowerCase\\(\\)|\\.toUpperCase\\(\\))?\\.(?:${SUBSTRING_METHODS})\\(`,
);

export interface Site {
  line: number;
  text: string;
}

/**
 * Find sites where an identifier's spelling is tested by substring.
 *
 * Two forms are recognised: the inline `node.id.name.includes('x')`, and the
 * two-step `const varName = node.id.name` followed by `varName.includes('x')`,
 * which is the more common shape because the name is usually lowercased first.
 */
export function findNameSubstringSites(source: string): Site[] {
  const lines = source.split('\n');

  const nameBindings = new Set<string>();
  NAME_BINDING.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NAME_BINDING.exec(source)) !== null) {
    const initializer = match[2];
    // The initializer is read through a LOOKAHEAD so the match consumes only
    // `const x =`. Consuming it swallowed everything to the first `;`, which
    // for `const isUntrusted = (n) => { const varName = n.name…; }` is inside
    // the arrow body — so the inner binding was skipped and the rule went
    // undetected. Two earlier shapes of this regex each dropped a real site.
    if (!/\.name\b/.test(initializer)) continue;
    if (TOKENISED.test(initializer)) continue;
    nameBindings.add(match[1]);
  }

  const boundSubstring = nameBindings.size
    ? new RegExp(`\\b(?:${[...nameBindings].join('|')})\\.(?:${SUBSTRING_METHODS})\\(`)
    : null;

  // The interprocedural shape the header used to call a known blind spot, and
  // route this file's own author around: rather than testing `node.name` here,
  // a helper returns the spelling and a SECOND function substring-matches a word
  // list against the string it was handed. No `.name` appears near the test, so
  // every check above stays silent.
  //
  // `credential-evidence.ts` was exactly this and shipped green — the blind spot
  // was written into this file's doc comment instead of being closed, which is
  // the "documenting a defect is not mitigating it" mistake in its purest form.
  //
  // Catching the VOCABULARY instead of the haystack closes it without needing to
  // follow values across functions: a four-plus list of string literals fed to
  // `.some(w => x.includes(w))` is a dictionary lookup on a name whatever the
  // haystack was called or wherever it came from.
  const wordLists = new Set<string>();
  WORD_LIST.lastIndex = 0;
  let list: RegExpExecArray | null;
  while ((list = WORD_LIST.exec(source)) !== null) wordLists.add(list[1]);

  const vocabularySubstring = wordLists.size
    ? new RegExp(
        `\\b(?:${[...wordLists].join('|')})\\.(?:some|find|filter|every)\\([^)]*\\.(?:${SUBSTRING_METHODS})\\(`,
      )
    : null;

  const sites: Site[] = [];
  lines.forEach((raw, index) => {
    const text = raw.trim();
    // Prose in a comment describes this pattern constantly — including in this
    // file's own header — and must never count as a site.
    if (text.startsWith('//') || text.startsWith('*') || text.startsWith('/*')) return;
    if (
      INLINE_NAME_SUBSTRING.test(raw) ||
      boundSubstring?.test(raw) ||
      vocabularySubstring?.test(raw)
    ) {
      sites.push({ line: index + 1, text: text.slice(0, 120) });
    }
  });
  return sites;
}

interface RegistryEntry {
  /** Path relative to packages/. */
  file: string;
  /** `report` raises a finding from a name; `suppress` withholds one. */
  direction: 'report' | 'suppress';
  reason: string;
}

/**
 * The existing set, measured 2026-08-13 across 271 rule files. Every entry is
 * debt, not an exemption — the target state is that a rule resolves the
 * identifier to an import, a call target or a value before claiming anything
 * about it.
 */
const REGISTERED: RegistryEntry[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // Surfaced 2026-08-16 when the vocabulary detector closed the helper blind
  // spot. These were ALWAYS here — the gate could not see them because the
  // substring test sits behind a word list rather than next to a `.name`.
  // Registered so the list is tracked, not so it is accepted: every `report`
  // entry below is a false positive waiting to reach a user, and CLAUDE.md
  // schedules them ahead of the `suppress` ones.
  // ═══════════════════════════════════════════════════════════════════════
  // The remaining vercel-ai-security rules share one helper shape: a list of AI
  // SDK entry points substring-matched against a callee to decide "is this an AI
  // call". They are grouped here because they need ONE fix — resolve the import
  // from `ai` / `@ai-sdk/*` once, in a shared util, the way node-security now
  // resolves child_process — not seven separate patches.
  {
    file: 'eslint-plugin-vercel-ai-security/src/rules/require-audit-logging/index.ts',
    direction: 'suppress',
    reason: 'AI SDK entry points substring-matched against a callee to gate the rule. Needs the shared import-resolution util.',
  },
  {
    file: 'eslint-plugin-vercel-ai-security/src/rules/require-error-handling/index.ts',
    direction: 'suppress',
    reason: 'AI SDK entry points substring-matched against a callee to gate the rule. Needs the shared import-resolution util.',
  },
  {
    file: 'eslint-plugin-vercel-ai-security/src/rules/require-output-validation/index.ts',
    direction: 'suppress',
    reason: 'AI SDK entry points substring-matched against a callee to gate the rule. Needs the shared import-resolution util.',
  },
  {
    file: 'eslint-plugin-vercel-ai-security/src/rules/require-rag-content-validation/index.ts',
    direction: 'suppress',
    reason: 'AI SDK entry points substring-matched against a callee to gate the rule. Needs the shared import-resolution util.',
  },
  {
    file: 'eslint-plugin-vercel-ai-security/src/rules/require-request-timeout/index.ts',
    direction: 'suppress',
    reason: 'AI SDK entry points substring-matched against a callee to gate the rule. Needs the shared import-resolution util.',
  },
  {
    file: 'eslint-plugin-vercel-ai-security/src/rules/require-tool-schema/index.ts',
    direction: 'suppress',
    reason: 'AI SDK entry points substring-matched against a callee to gate the rule. Needs the shared import-resolution util.',
  },
  {
    file: 'eslint-plugin-vercel-ai-security/src/rules/require-validated-prompt/index.ts',
    direction: 'suppress',
    reason: 'AI SDK entry points substring-matched against a callee to gate the rule. Needs the shared import-resolution util.',
  },
  {
    file: 'eslint-plugin-mongodb-security/src/rules/no-operator-injection/index.ts',
    direction: 'report',
    reason:
      'userInputPatterns substring-matched against the printed text of a value to decide it is ' +
      'user input. The same defect no-ssrf carried until it moved to readsRequestShape, one ' +
      'layer further from the AST.',
  },
  {
    file: 'eslint-plugin-vercel-ai-security/src/rules/no-dynamic-system-prompt/index.ts',
    direction: 'suppress',
    reason:
      'aiSDKFunctions substring-matched against a callee to decide whether this is an AI SDK ' +
      'call at all. Loose matching here GATES the rule on, so it widens what reports — but the ' +
      'names (generateText, streamText) are distinctive enough that the practical risk is a ' +
      'missed call, not a false one. Resolve the import instead.',
  },
  {
    file: 'eslint-plugin-vercel-ai-security/src/rules/no-hardcoded-api-keys/index.ts',
    direction: 'suppress',
    reason: 'providerFunctions substring-matched against a callee; same shape as no-dynamic-system-prompt.',
  },
  {
    file: 'eslint-plugin-vercel-ai-security/src/rules/no-sensitive-in-prompt/index.ts',
    direction: 'suppress',
    reason: 'aiSDKFunctions substring-matched against a callee; same shape as no-dynamic-system-prompt.',
  },
  {
    file: 'eslint-plugin-vercel-ai-security/src/rules/no-unsafe-output-handling/index.ts',
    direction: 'report',
    reason:
      'dangerousFunctions substring-matched against a callee to decide the sink is dangerous. ' +
      '`exec` matches `execute`, `eval` matches `evaluate` — both ordinary method names.',
  },
  // ── direction: report — a wrong guess ships a false positive ──────────
  {
    file: 'eslint-plugin-secure-coding/src/rules/no-hardcoded-session-tokens/index.ts',
    direction: 'report',
    reason:
      'varName.includes("session"|"token") plus a literal. This is the no-timing-unsafe-compare ' +
      'shape exactly: the name carries the whole claim, and the literal it is compared against ' +
      'is never examined for whether it is actually a credential.',
  },
  {
    file: 'eslint-plugin-secure-coding/src/rules/no-format-string-injection/index.ts',
    direction: 'report',
    reason:
      'varName.includes("format"|"template"|"pattern") to decide a value is a format string. ' +
      'The rule has a real sink path; this branch bypasses it.',
  },
  {
    file: 'eslint-plugin-lambda-security/src/rules/no-hardcoded-credentials-sdk/index.ts',
    direction: 'report',
    reason: 'node.id.name.toLowerCase().includes("credential") is the sole basis for the finding.',
  },
  {
    file: 'eslint-plugin-lambda-security/src/rules/no-permissive-cors-response/index.ts',
    direction: 'report',
    reason:
      'node.id.name.toLowerCase().includes("response") to decide a variable is an HTTP response ' +
      'object, before judging its CORS headers.',
  },
  {
    file: 'eslint-plugin-node-security/src/rules/no-zip-slip/index.ts',
    direction: 'report',
    reason:
      'varName.includes("entry"|"file"|"path") to identify an archive entry. Also carries a ' +
      'suppress-direction site (safeLibraries) — the report direction is the one that matters.',
  },
  {
    file: 'eslint-plugin-express-security/src/rules/require-rate-limiting/index.ts',
    direction: 'report',
    reason:
      'calleeName.includes(pattern) against a rate-limiter vocabulary. Promoted to error under ' +
      '#517, which raises the cost of a wrong guess here — first candidate for resolution work.',
  },
  {
    file: 'eslint-plugin-secure-coding/src/rules/no-xpath-injection/index.ts',
    direction: 'report',
    reason:
      'varName.includes("req"|"request"|"query"|"params"|"input"|"user"|"search") standing in ' +
      'for taint. `req` matches `requiredFields` and `prereqList`; `user` matches `userAgent`. ' +
      'The rule was rebuilt around a real XPath sink in #490 and its concatenation branch now ' +
      'gates correctly — this taint arm is the last part still reasoning from spelling.',
  },

  // ── direction: suppress — a wrong guess costs a detection, silently ───
  {
    file: 'eslint-plugin-browser-security/src/rules/no-missing-cors-check/index.ts',
    direction: 'suppress',
    reason:
      'trustedLibraries substring-matched against a callee name to withhold a finding. Anything ' +
      'whose name contains the library string is trusted, so `notAxiosWrapper` silences the rule. ' +
      'Already grandfathered in lint-plugin-taxonomy.ts as a duplicate-id rule slated for retirement.',
  },
  {
    file: 'eslint-plugin-express-security/src/rules/no-missing-cors-check/index.ts',
    direction: 'suppress',
    reason: 'Same trustedLibraries suppression as its browser-security twin; the two are near-duplicates.',
  },
  {
    file: 'eslint-plugin-express-security/src/rules/require-csrf-protection/index.ts',
    direction: 'suppress',
    reason:
      'name.includes("csrf"|"csurf") to conclude CSRF middleware is present. A variable named ' +
      '`csrfDisabled` satisfies it, which is the inversion of the intended meaning.',
  },
  {
    file: 'eslint-plugin-secure-coding/src/rules/no-graphql-injection/index.ts',
    direction: 'suppress',
    reason: 'trustedGraphqlLibraries substring-matched against a callee name to withhold a finding.',
  },
  {
    file: 'eslint-plugin-secure-coding/src/rules/no-directive-injection/index.ts',
    direction: 'suppress',
    reason:
      'callee.object.name.toLowerCase().includes("purify") to treat a value as sanitised. ' +
      '`notPurifiedYet` qualifies as sanitised.',
  },
];

export interface Violation {
  file: string;
  sites: Site[];
}

export interface NameInferenceReport {
  /** Unregistered rules matching a name by substring — hard failures. */
  violations: Violation[];
  /** Registry entries whose sites are gone; delete the entry. */
  staleRegistry: string[];
  filesScanned: number;
  registered: number;
}

export function checkNameInference(
  files: { file: string; source: string }[],
  registry: RegistryEntry[] = REGISTERED,
): NameInferenceReport {
  const registered = new Set(registry.map((r) => r.file));
  const withSites = new Set<string>();
  const violations: Violation[] = [];

  for (const { file, source } of files) {
    const sites = findNameSubstringSites(source);
    if (sites.length === 0) continue;
    withSites.add(file);
    if (!registered.has(file)) violations.push({ file, sites });
  }

  const staleRegistry = registry
    .filter((r) => !withSites.has(r.file))
    .map((r) => `${r.file} — no name-substring sites left; delete the entry`);

  return { violations, staleRegistry, filesScanned: files.length, registered: registry.length };
}

/**
 * Every file a name-substring check can live in.
 *
 * `src/utils` is scanned as well as `src/rules`, because a shared helper is exactly
 * where this class hides. Moving `.includes('encrypt')` out of two rule files and into
 * `utils/credential-evidence.ts` made both registry entries read as paid while the
 * substring match — and the `decrypt` overlap it carried — was still shipping. The gate
 * reported the debt cleared because it could no longer see it, which is the failure mode
 * this ratchet exists to prevent.
 */
function ruleSources(): { file: string; source: string }[] {
  const files: { file: string; source: string }[] = [];
  if (!fs.existsSync(PACKAGES_DIR)) return files;

  const add = (entry: string): void => {
    if (!fs.existsSync(entry)) return;
    files.push({
      file: path.relative(PACKAGES_DIR, entry),
      source: fs.readFileSync(entry, 'utf8'),
    });
  };

  for (const plugin of fs.readdirSync(PACKAGES_DIR)) {
    const rulesDir = path.join(PACKAGES_DIR, plugin, 'src', 'rules');
    if (fs.existsSync(rulesDir)) {
      for (const rule of fs.readdirSync(rulesDir)) {
        add(path.join(rulesDir, rule, 'index.ts'));
      }
    }

    const utilsDir = path.join(PACKAGES_DIR, plugin, 'src', 'utils');
    if (!fs.existsSync(utilsDir)) continue;
    for (const util of fs.readdirSync(utilsDir)) {
      if (!util.endsWith('.ts') || util.endsWith('.test.ts')) continue;
      add(path.join(utilsDir, util));
    }
  }
  return files;
}

function main(): void {
  const quiet = process.argv.includes('--quiet');
  const list = process.argv.includes('--list');
  const sources = ruleSources();
  const { violations, staleRegistry, filesScanned, registered } = checkNameInference(sources);

  if (list) {
    for (const { file, source } of sources) {
      const sites = findNameSubstringSites(source);
      if (!sites.length) continue;
      console.log(`\n${file}`);
      for (const s of sites) console.log(`  ${s.line}: ${s.text}`);
    }
  }

  if (violations.length === 0 && staleRegistry.length === 0) {
    if (!quiet) {
      console.log(
        `✅ ${filesScanned} rule(s) scanned — no new name-substring inference. ` +
          `${registered} known site(s) registered as debt.`,
      );
    }
    process.exit(0);
  }

  if (violations.length > 0) {
    console.error(`❌ ${violations.length} rule(s) test an identifier's spelling by substring:\n`);
    for (const v of violations) {
      console.error(`  - ${v.file}`);
      for (const s of v.sites) console.error(`      ${s.line}: ${s.text}`);
    }
    console.error('');
    console.error('  A name is not a type. `propName.includes("phone")` matches `phoneBookLength`,');
    console.error('  and `name.includes("react")` matches `preact` — a real package, and a real');
    console.error('  finding we shipped. Resolve the identifier to an import, a call target or a');
    console.error('  value before reporting on it.');
    console.error('');
    console.error('  Exact membership (`NAMES.has(node.name)`) is NOT this and does not need');
    console.error('  registering. If the substring test is genuinely correct here, add the rule to');
    console.error('  REGISTERED in scripts/lint-name-inference.ts with its direction and the reason.\n');
  }

  if (staleRegistry.length > 0) {
    console.error(`❌ ${staleRegistry.length} stale registry entr(ies) — the debt was paid, the record wasn't:\n`);
    for (const s of staleRegistry) console.error(`  - ${s}`);
    console.error('');
  }

  process.exit(1);
}

if (import.meta.url === url.pathToFileURL(process.argv[1] ?? '').href) {
  main();
}

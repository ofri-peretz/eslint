/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ilb-formatter fixtures — deterministic synthetic LintResult[] generator.
 *
 * Fixture corpus is *programmatic* (not JSON on disk) because the only
 * variation that matters here is shape × scale; storing 25 large JSON
 * blobs would just add maintenance overhead. The seed and version are
 * frozen below; any change bumps `FIXTURES_VERSION` per methodology v1.0.
 */

export const FIXTURES_VERSION = 'v1.1';

export type Shape =
  | 'mono-rule-storm'
  | 'diverse-rules'
  | 'mixed-severity'
  | 'all-fixable'
  | 'security-heavy'
  | 'rare-error-amid-noise';

export type Scale = 'tiny' | 'small' | 'medium' | 'large' | 'extreme';

export interface ScalePlan {
  files: number;
  findings: number;
}

export const SCALES: Record<Scale, ScalePlan> = {
  tiny: { files: 1, findings: 3 },
  small: { files: 10, findings: 30 },
  medium: { files: 100, findings: 300 },
  large: { files: 500, findings: 1500 },
  extreme: { files: 2000, findings: 6000 },
};

export const SHAPES: Shape[] = [
  'mono-rule-storm',
  'diverse-rules',
  'mixed-severity',
  'all-fixable',
  'security-heavy',
  'rare-error-amid-noise',
];

interface SyntheticMessage {
  ruleId: string;
  severity: 1 | 2;
  message: string;
  line: number;
  column: number;
  nodeType: string | null;
  fix?: { range: [number, number]; text: string };
}

interface SyntheticResult {
  filePath: string;
  messages: SyntheticMessage[];
  errorCount: number;
  warningCount: number;
  fixableErrorCount: number;
  fixableWarningCount: number;
  source?: string;
}

export interface SyntheticFixture {
  shape: Shape;
  scale: Scale;
  results: SyntheticResult[];
  /** Truth set used by signal-preservation probes. */
  truth: {
    ruleIds: string[];
    /** Total findings expected per rule. */
    countsByRule: Record<string, number>;
    /** Severity per rule (max seen). */
    severityByRule: Record<string, 'error' | 'warning'>;
    /** Whether each rule has at least one fixable occurrence. */
    fixableByRule: Record<string, boolean>;
    totalFindings: number;
    totalFiles: number;
  };
  rulesMeta: Record<string, { type: string; docs: { description: string; url: string } }>;
}

// ---------------------------------------------------------------------------
// SEEDED RNG (mulberry32) — deterministic per (shape, scale)
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFor(shape: Shape, scale: Scale): number {
  // Deterministic mapping: shape index * 1000 + scale index. Locked.
  const s = SHAPES.indexOf(shape);
  const k = (Object.keys(SCALES) as Scale[]).indexOf(scale);
  return 1_000_003 + s * 100 + k;
}

// ---------------------------------------------------------------------------
// RULE TEMPLATES
// ---------------------------------------------------------------------------

interface RuleTemplate {
  id: string;
  severity: 1 | 2;
  message: string;
  description: string;
  docsUrl: string;
  fixable: boolean;
}

const QUALITY_RULES: RuleTemplate[] = [
  { id: 'no-unused-vars', severity: 1, message: "'x' is defined but never used", description: 'Disallow unused variables', docsUrl: 'https://eslint.org/docs/rules/no-unused-vars', fixable: false },
  { id: 'no-console', severity: 1, message: 'Unexpected console statement', description: 'Disallow the use of console', docsUrl: 'https://eslint.org/docs/rules/no-console', fixable: false },
  { id: 'prefer-const', severity: 2, message: "'foo' is never reassigned. Use 'const' instead", description: 'Require const for never-reassigned bindings', docsUrl: 'https://eslint.org/docs/rules/prefer-const', fixable: true },
  { id: 'eqeqeq', severity: 2, message: "Expected '===' and instead saw '=='", description: 'Require strict equality', docsUrl: 'https://eslint.org/docs/rules/eqeqeq', fixable: true },
  { id: 'no-var', severity: 2, message: "Unexpected var, use let or const instead", description: 'Disallow var', docsUrl: 'https://eslint.org/docs/rules/no-var', fixable: true },
  { id: 'curly', severity: 1, message: 'Expected { after if condition', description: 'Require following curly brace conventions', docsUrl: 'https://eslint.org/docs/rules/curly', fixable: true },
  { id: 'no-implicit-globals', severity: 2, message: 'Implicit global variable', description: 'Disallow implicit globals', docsUrl: 'https://eslint.org/docs/rules/no-implicit-globals', fixable: false },
  { id: 'no-throw-literal', severity: 2, message: 'Expected an Error object to be thrown', description: 'Disallow throwing literals as exceptions', docsUrl: 'https://eslint.org/docs/rules/no-throw-literal', fixable: false },
  { id: 'consistent-return', severity: 1, message: 'Function expected a return value', description: 'Require consistent return values', docsUrl: 'https://eslint.org/docs/rules/consistent-return', fixable: false },
  { id: 'no-shadow', severity: 1, message: "'foo' is already declared in the upper scope", description: 'Disallow variable shadowing', docsUrl: 'https://eslint.org/docs/rules/no-shadow', fixable: false },
];

const SECURITY_RULES: RuleTemplate[] = [
  { id: '@interlace/pg/no-unsafe-query', severity: 2, message: 'SQL injection: query built via string concatenation', description: 'Detect SQL injection via string concatenation', docsUrl: 'https://interlace.tools/docs/pg/no-unsafe-query', fixable: false },
  { id: '@interlace/secure-coding/no-insecure-random', severity: 2, message: 'Use of Math.random() for security-sensitive values', description: 'Forbid Math.random() in security contexts', docsUrl: 'https://interlace.tools/docs/secure-coding/no-insecure-random', fixable: true },
  { id: '@interlace/browser-security/no-inner-html', severity: 2, message: 'innerHTML assignment with non-literal value', description: 'Avoid innerHTML XSS vector', docsUrl: 'https://interlace.tools/docs/browser-security/no-inner-html', fixable: false },
  { id: '@interlace/secure-coding/no-hardcoded-credentials', severity: 2, message: 'Hardcoded credential detected', description: 'Forbid hardcoded credentials', docsUrl: 'https://interlace.tools/docs/secure-coding/no-hardcoded-credentials', fixable: false },
  { id: '@interlace/node-security/no-zip-slip', severity: 2, message: 'Possible zip-slip path traversal', description: 'Detect zip-slip patterns', docsUrl: 'https://interlace.tools/docs/node-security/no-zip-slip', fixable: false },
  { id: '@interlace/express-security/no-open-redirect', severity: 2, message: 'Open-redirect via untrusted target', description: 'Detect open-redirect vectors', docsUrl: 'https://interlace.tools/docs/express-security/no-open-redirect', fixable: false },
  { id: '@interlace/mongodb-security/no-nosql-injection', severity: 2, message: 'NoSQL injection via untrusted operator', description: 'Detect NoSQL injection', docsUrl: 'https://interlace.tools/docs/mongodb-security/no-nosql-injection', fixable: false },
  { id: '@interlace/secure-coding/no-ssrf', severity: 2, message: 'SSRF: untrusted URL passed to fetcher', description: 'Detect SSRF vectors', docsUrl: 'https://interlace.tools/docs/secure-coding/no-ssrf', fixable: false },
  { id: '@interlace/jwt/no-weak-secret', severity: 2, message: 'JWT signed with weak secret', description: 'Forbid weak JWT secrets', docsUrl: 'https://interlace.tools/docs/jwt/no-weak-secret', fixable: false },
  { id: '@interlace/crypto/no-weak-hash', severity: 2, message: 'Weak hash algorithm (md5/sha1)', description: 'Forbid weak hash algorithms', docsUrl: 'https://interlace.tools/docs/crypto/no-weak-hash', fixable: true },
];

const ALL_RULES: RuleTemplate[] = [...QUALITY_RULES, ...SECURITY_RULES];

// ---------------------------------------------------------------------------
// FIXTURE BUILDERS
// ---------------------------------------------------------------------------

function emptyTruth(totalFiles: number): SyntheticFixture['truth'] {
  return {
    ruleIds: [],
    countsByRule: {},
    severityByRule: {},
    fixableByRule: {},
    totalFindings: 0,
    totalFiles,
  };
}

function recordTruth(
  truth: SyntheticFixture['truth'],
  rule: RuleTemplate,
  hasFix: boolean,
): void {
  if (!(rule.id in truth.countsByRule)) {
    truth.ruleIds.push(rule.id);
    truth.countsByRule[rule.id] = 0;
    truth.severityByRule[rule.id] = rule.severity === 2 ? 'error' : 'warning';
    truth.fixableByRule[rule.id] = false;
  }
  truth.countsByRule[rule.id]! += 1;
  if (rule.severity === 2) truth.severityByRule[rule.id] = 'error';
  if (hasFix) truth.fixableByRule[rule.id] = true;
  truth.totalFindings += 1;
}

function metaFor(rules: RuleTemplate[]): SyntheticFixture['rulesMeta'] {
  const meta: SyntheticFixture['rulesMeta'] = {};
  for (const r of rules) {
    meta[r.id] = { type: 'problem', docs: { description: r.description, url: r.docsUrl } };
  }
  return meta;
}

function buildResult(
  filePath: string,
  messages: SyntheticMessage[],
): SyntheticResult {
  let errorCount = 0;
  let warningCount = 0;
  let fixableErrorCount = 0;
  let fixableWarningCount = 0;
  for (const m of messages) {
    if (m.severity === 2) {
      errorCount++;
      if (m.fix) fixableErrorCount++;
    } else {
      warningCount++;
      if (m.fix) fixableWarningCount++;
    }
  }
  return { filePath, messages, errorCount, warningCount, fixableErrorCount, fixableWarningCount };
}

function makeMessage(
  rule: RuleTemplate,
  line: number,
  column: number,
  withFix: boolean,
): SyntheticMessage {
  const msg: SyntheticMessage = {
    ruleId: rule.id,
    severity: rule.severity,
    message: rule.message,
    line,
    column,
    nodeType: null,
  };
  if (withFix && rule.fixable) {
    msg.fix = { range: [0, 4], text: '' };
  }
  return msg;
}

function buildMonoRuleStorm(scale: Scale): SyntheticFixture {
  const plan = SCALES[scale];
  const rng = mulberry32(seedFor('mono-rule-storm', scale));
  const rule = QUALITY_RULES[1]!; // no-console
  const truth = emptyTruth(plan.files);
  const results: SyntheticResult[] = [];

  // Distribute findings round-robin across files; some files get 0.
  const messagesPerFile: SyntheticMessage[][] = Array.from({ length: plan.files }, () => []);
  for (let i = 0; i < plan.findings; i++) {
    const fileIdx = i % plan.files;
    const line = 1 + Math.floor(rng() * 200);
    const col = 1 + Math.floor(rng() * 80);
    const msg = makeMessage(rule, line, col, false);
    messagesPerFile[fileIdx]!.push(msg);
    recordTruth(truth, rule, false);
  }

  for (let i = 0; i < plan.files; i++) {
    results.push(buildResult(`/repo/src/module${i}/index.ts`, messagesPerFile[i]!));
  }

  return {
    shape: 'mono-rule-storm',
    scale,
    results,
    truth,
    rulesMeta: metaFor([rule]),
  };
}

function buildDiverseRules(scale: Scale): SyntheticFixture {
  const plan = SCALES[scale];
  const rng = mulberry32(seedFor('diverse-rules', scale));
  const truth = emptyTruth(plan.files);
  const results: SyntheticResult[] = [];

  // Use up to 20 distinct rules — pad/cap to fit.
  const ruleCount = Math.min(20, ALL_RULES.length);
  const messagesPerFile: SyntheticMessage[][] = Array.from({ length: plan.files }, () => []);

  for (let i = 0; i < plan.findings; i++) {
    const rule = ALL_RULES[i % ruleCount]!;
    const fileIdx = i % plan.files;
    const line = 1 + Math.floor(rng() * 200);
    const col = 1 + Math.floor(rng() * 80);
    const msg = makeMessage(rule, line, col, false);
    messagesPerFile[fileIdx]!.push(msg);
    recordTruth(truth, rule, false);
  }
  for (let i = 0; i < plan.files; i++) {
    results.push(buildResult(`/repo/src/module${i}/index.ts`, messagesPerFile[i]!));
  }
  return {
    shape: 'diverse-rules',
    scale,
    results,
    truth,
    rulesMeta: metaFor(ALL_RULES.slice(0, ruleCount)),
  };
}

function buildMixedSeverity(scale: Scale): SyntheticFixture {
  const plan = SCALES[scale];
  const rng = mulberry32(seedFor('mixed-severity', scale));
  const truth = emptyTruth(plan.files);
  const results: SyntheticResult[] = [];

  // 60% errors, 40% warnings — pick rules whose template severity matches.
  const errorRules = ALL_RULES.filter(r => r.severity === 2);
  const warnRules = ALL_RULES.filter(r => r.severity === 1);
  const messagesPerFile: SyntheticMessage[][] = Array.from({ length: plan.files }, () => []);

  for (let i = 0; i < plan.findings; i++) {
    const wantError = (i % 5) < 3; // 3/5 = 60 %
    const pool = wantError ? errorRules : warnRules;
    const rule = pool[i % pool.length]!;
    const fileIdx = i % plan.files;
    const line = 1 + Math.floor(rng() * 200);
    const col = 1 + Math.floor(rng() * 80);
    const msg = makeMessage(rule, line, col, false);
    messagesPerFile[fileIdx]!.push(msg);
    recordTruth(truth, rule, false);
  }
  for (let i = 0; i < plan.files; i++) {
    results.push(buildResult(`/repo/src/module${i}/index.ts`, messagesPerFile[i]!));
  }
  return {
    shape: 'mixed-severity',
    scale,
    results,
    truth,
    rulesMeta: metaFor(ALL_RULES),
  };
}

function buildAllFixable(scale: Scale): SyntheticFixture {
  const plan = SCALES[scale];
  const rng = mulberry32(seedFor('all-fixable', scale));
  const truth = emptyTruth(plan.files);
  const results: SyntheticResult[] = [];

  const fixableRules = ALL_RULES.filter(r => r.fixable);
  const messagesPerFile: SyntheticMessage[][] = Array.from({ length: plan.files }, () => []);

  for (let i = 0; i < plan.findings; i++) {
    const rule = fixableRules[i % fixableRules.length]!;
    const fileIdx = i % plan.files;
    const line = 1 + Math.floor(rng() * 200);
    const col = 1 + Math.floor(rng() * 80);
    const msg = makeMessage(rule, line, col, true);
    messagesPerFile[fileIdx]!.push(msg);
    recordTruth(truth, rule, true);
  }
  for (let i = 0; i < plan.files; i++) {
    results.push(buildResult(`/repo/src/module${i}/index.ts`, messagesPerFile[i]!));
  }
  return {
    shape: 'all-fixable',
    scale,
    results,
    truth,
    rulesMeta: metaFor(fixableRules),
  };
}

/**
 * `rare-error-amid-noise` — exercises the severity-first ordering path.
 *
 * 1 single critical security error (`pg/no-unsafe-query`) firing once,
 * and the remaining findings are noisy `no-console` warnings. A
 * count-desc-only sort would render the error LAST (count=1 vs
 * count=N). With severity-first ordering the error renders FIRST,
 * matching how an LLM or human would prioritise triage.
 *
 * The fixture's truth set names two rules — the bench's signal probes
 * are unchanged; this shape exists to surface ordering quality in
 * console output and per-shape latency/cost numbers, not to redefine
 * the contracts.
 */
function buildRareErrorAmidNoise(scale: Scale): SyntheticFixture {
  const plan = SCALES[scale];
  const rng = mulberry32(seedFor('rare-error-amid-noise', scale));
  const errorRule = SECURITY_RULES.find(r => r.id === '@interlace/pg/no-unsafe-query')!;
  const noiseRule = QUALITY_RULES.find(r => r.id === 'no-console')!;
  const truth = emptyTruth(plan.files);
  const messagesPerFile: SyntheticMessage[][] = Array.from({ length: plan.files }, () => []);

  // Place the rare error in a deterministic file (file 0, line 7).
  messagesPerFile[0]!.push(makeMessage(errorRule, 7, 5, false));
  recordTruth(truth, errorRule, false);

  // Fill the remaining (findings - 1) with noise warnings spread across files.
  for (let i = 1; i < plan.findings; i++) {
    const fileIdx = i % plan.files;
    const line = 1 + Math.floor(rng() * 200);
    const col = 1 + Math.floor(rng() * 80);
    messagesPerFile[fileIdx]!.push(makeMessage(noiseRule, line, col, false));
    recordTruth(truth, noiseRule, false);
  }

  const results: SyntheticResult[] = [];
  for (let i = 0; i < plan.files; i++) {
    results.push(buildResult(`/repo/src/module${i}/index.ts`, messagesPerFile[i]!));
  }
  return {
    shape: 'rare-error-amid-noise',
    scale,
    results,
    truth,
    rulesMeta: metaFor([errorRule, noiseRule]),
  };
}

function buildSecurityHeavy(scale: Scale): SyntheticFixture {
  const plan = SCALES[scale];
  const rng = mulberry32(seedFor('security-heavy', scale));
  const truth = emptyTruth(plan.files);
  const results: SyntheticResult[] = [];

  const messagesPerFile: SyntheticMessage[][] = Array.from({ length: plan.files }, () => []);
  for (let i = 0; i < plan.findings; i++) {
    const rule = SECURITY_RULES[i % SECURITY_RULES.length]!;
    const fileIdx = i % plan.files;
    const line = 1 + Math.floor(rng() * 200);
    const col = 1 + Math.floor(rng() * 80);
    const withFix = rule.fixable && (i % 4 === 0); // some fixable
    const msg = makeMessage(rule, line, col, withFix);
    messagesPerFile[fileIdx]!.push(msg);
    recordTruth(truth, rule, !!msg.fix);
  }
  for (let i = 0; i < plan.files; i++) {
    results.push(buildResult(`/repo/src/module${i}/index.ts`, messagesPerFile[i]!));
  }
  return {
    shape: 'security-heavy',
    scale,
    results,
    truth,
    rulesMeta: metaFor(SECURITY_RULES),
  };
}

const BUILDERS: Record<Shape, (scale: Scale) => SyntheticFixture> = {
  'mono-rule-storm': buildMonoRuleStorm,
  'diverse-rules': buildDiverseRules,
  'mixed-severity': buildMixedSeverity,
  'all-fixable': buildAllFixable,
  'security-heavy': buildSecurityHeavy,
  'rare-error-amid-noise': buildRareErrorAmidNoise,
};

export function buildFixture(shape: Shape, scale: Scale): SyntheticFixture {
  return BUILDERS[shape](scale);
}

export function allFixtures(): SyntheticFixture[] {
  const out: SyntheticFixture[] = [];
  for (const shape of SHAPES) {
    for (const scale of Object.keys(SCALES) as Scale[]) {
      out.push(buildFixture(shape, scale));
    }
  }
  return out;
}

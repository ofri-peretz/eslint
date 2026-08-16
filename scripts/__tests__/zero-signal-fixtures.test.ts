/**
 * Corpus fixtures for the 16 zero-signal rules (#520).
 *
 * These sixteen rules produced no findings on any corpus. That reading is
 * ambiguous by construction — the rule may be precise and the corpus may
 * simply lack the pattern, or the rule may be broken — and while it stays
 * ambiguous no preset-membership decision about them is measurable. The
 * preset audit concluded that none of the 44 non-recommended rules earns
 * promotion; for these sixteen that conclusion rested on absence of evidence.
 *
 * WHY THIS IS A TEST AND NOT JUST FIXTURES. `benchmarks/suites/ilb-cwe-corpus`
 * lints the corpus through `<plugin>.configs.recommended`, and every rule here
 * is NON-recommended — that is what put them in the audit in the first place.
 * Fixtures alone would therefore have been inert: sixteen vulnerable files sitting
 * in the corpus that no configured rule was ever asked to look at, still
 * reporting zero, still ambiguous. That circularity is the actual reason these
 * rules had no signal, and it is not fixed by adding files.
 *
 * So each rule is loaded from source and run against its own fixture pair with
 * that rule, and only that rule, enabled. The result is a real answer to "does
 * this rule work", independent of preset membership — which is the question the
 * membership decision needs answered first.
 *
 * WHY A SEPARATE CORPUS DIRECTORY. These fixtures first went into
 * `benchmarks/corpus/`, and that was wrong in a way worth recording. That
 * corpus is a CALIBRATED benchmark: `scripts/recall-gate.ts` holds a per-CWE
 * detection budget against it, the six-tool suite scores competitors on it, and
 * the numbers it produces are published. Dropping in vulnerable files that the
 * recommended presets are not configured to detect moved CWE-327 from 2/4 to
 * 2/7 — a recall figure that fell because the denominator grew, not because
 * anything regressed — and two safe fixtures drew reports from OTHER rules,
 * failing the gate with "2 gained a false positive".
 *
 * Neither was a real regression, and that is exactly the problem: it would have
 * quietly restated a published benchmark as worse. A corpus with a budget
 * attached is an instrument, and adding fixtures aimed at rules the instrument
 * does not enable is miscalibrating it. `benchmarks/corpus/` is untouched;
 * `CORPUS_DIR` there is an exact path, so nothing in the suite or the recall
 * gate can see this directory.
 */
import { describe, expect, it } from 'vitest';
import { Linter } from 'eslint';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../..');
const CORPUS = path.join(REPO_ROOT, 'benchmarks', 'corpus-zero-signal');

interface Case {
  cwe: string;
  plugin: string;
  rule: string;
  vulnerable: string;
  safe: string;
  /**
   * Set when the rule does not accept the genuine remediation, so its `safe`
   * fixture still reports. This is recorded debt, not a blessed exception: the
   * fixture stays in its honest form, and the entry is asserted to still be
   * needed, so fixing the rule forces the entry's removal.
   */
  safeFixtureStillReports?: string;
}

const CASES: Case[] = [
  { cwe: 'CWE-359', plugin: 'secure-coding', rule: 'no-pii-in-logs', vulnerable: 'pii-console-log.js', safe: 'pii-redacted-log.js' },
  { cwe: 'CWE-359', plugin: 'browser-security', rule: 'no-sensitive-data-in-analytics', vulnerable: 'analytics-email-property.js', safe: 'analytics-opaque-id.js' },
  { cwe: 'CWE-359', plugin: 'browser-security', rule: 'no-tracking-without-consent', vulnerable: 'track-without-consent.js', safe: 'track-behind-consent.js' },
  { cwe: 'CWE-521', plugin: 'secure-coding', rule: 'detect-weak-password-validation', vulnerable: 'password-min-length-4.js', safe: 'password-min-length-12.js' },
  { cwe: 'CWE-521', plugin: 'browser-security', rule: 'no-password-in-url', vulnerable: 'credentials-in-url.js', safe: 'credentials-in-header.js' },
  { cwe: 'CWE-312', plugin: 'node-security', rule: 'require-secure-credential-storage', vulnerable: 'asyncstorage-api-key.js', safe: 'keychain-api-key.js' },
  {
    // require-storage-encryption owns the FILESYSTEM; client storage (localStorage,
    // sessionStorage, AsyncStorage) belongs to require-secure-credential-storage above.
    // Both rules used to carry byte-identical implementations firing on any `.setItem`
    // or `.writeFile`, so this corpus had them sharing a receiver and every real finding
    // was reported twice under two rule ids and the same CWE.
    cwe: 'CWE-312', plugin: 'node-security', rule: 'require-storage-encryption',
    vulnerable: 'fs-writefile-password.js', safe: 'fs-writefile-encrypted-password.js',
  },
  { cwe: 'CWE-338', plugin: 'node-security', rule: 'no-cryptojs-weak-random', vulnerable: 'cryptojs-wordarray-random.js', safe: 'node-crypto-random-bytes.js' },
  { cwe: 'CWE-327', plugin: 'node-security', rule: 'no-deprecated-cipher-method', vulnerable: 'create-cipher-deprecated.js', safe: 'create-cipheriv-explicit.js' },
  { cwe: 'CWE-327', plugin: 'node-security', rule: 'no-insecure-rsa-padding', vulnerable: 'rsa-pkcs1-padding.js', safe: 'rsa-oaep-padding.js' },
  { cwe: 'CWE-327', plugin: 'node-security', rule: 'no-sha1-hash', vulnerable: 'crypto-hash-sha1.js', safe: 'crypto-hash-sha256.js' },
  { cwe: 'CWE-916', plugin: 'node-security', rule: 'no-insecure-key-derivation', vulnerable: 'pbkdf2-1000-iterations.js', safe: 'pbkdf2-600k-iterations.js' },
  { cwe: 'CWE-079', plugin: 'browser-security', rule: 'no-unescaped-url-parameter', vulnerable: 'url-param-unescaped.js', safe: 'url-param-encoded.js' },
  {
    // `safeFixtureStillReports` removed 2026-08-16: the rule accepted only string
    // LITERALS, so the guarded form reported identically to the unguarded write and
    // nothing short of hardcoding the destination satisfied it. That finding is
    // gone, and this test is what caught that it had gone — it fails when a
    // documented false positive is fixed, which is the right way round.
    cwe: 'CWE-601', plugin: 'browser-security', rule: 'require-url-validation',
    vulnerable: 'location-assign-unvalidated.js', safe: 'location-assign-allowlisted.js',
  },
  { cwe: 'CWE-434', plugin: 'browser-security', rule: 'require-mime-type-validation', vulnerable: 'multer-no-filter.js', safe: 'multer-with-filter.js' },
  { cwe: 'CWE-294', plugin: 'jwt-security', rule: 'require-issued-at', vulnerable: 'jwt-no-timestamp.js', safe: 'jwt-default-iat.js' },
];

async function lintWithRule(plugin: string, ruleName: string, file: string): Promise<number> {
  const source = fs.readFileSync(file, 'utf8');
  const modPath = path.join(REPO_ROOT, 'packages', `eslint-plugin-${plugin}`, 'src', 'rules', ruleName, 'index.ts');
  const mod = (await import(modPath)) as Record<string, unknown>;
  const rule =
    (mod.default as { create?: unknown } | undefined)?.create !== undefined
      ? mod.default
      : Object.values(mod).find((v) => (v as { create?: unknown })?.create !== undefined);
  expect(rule, `${plugin}/${ruleName} exports no rule object`).toBeDefined();

  // `sourceType` is inferred rather than fixed: the crypto fixtures are CommonJS
  // because that is how the APIs are used in the wild, and the jwt/crypto-hash
  // ones are ESM because those packages are ESM-only. Forcing one would be a
  // parse error masquerading as a detection result.
  const sourceType = /^\s*(import|export)\s/m.test(source) ? 'module' : 'commonjs';

  return new Linter().verify(
    source,
    [
      {
        files: ['**/*'],
        plugins: { probe: { rules: { [ruleName]: rule as never } } },
        languageOptions: { ecmaVersion: 2023, sourceType },
        rules: { [`probe/${ruleName}`]: 'error' },
      },
    ],
    file,
  ).length;
}

describe.each(CASES)('$plugin/$rule ($cwe)', (testCase) => {
  const dir = path.join(CORPUS, testCase.cwe);

  it('has both fixtures on disk', () => {
    expect(fs.existsSync(path.join(dir, 'vulnerable', testCase.vulnerable))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'safe', testCase.safe))).toBe(true);
  });

  it('is listed in the CWE manifest', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    expect(manifest.fixtures.vulnerable.map((f: { file: string }) => f.file)).toContain(testCase.vulnerable);
    expect(manifest.fixtures.safe.map((f: { file: string }) => f.file)).toContain(testCase.safe);
  });

  it('fires on the vulnerable fixture', async () => {
    const count = await lintWithRule(testCase.plugin, testCase.rule, path.join(dir, 'vulnerable', testCase.vulnerable));
    expect(count).toBeGreaterThan(0);
  });

  it('stays silent on the safe fixture', async () => {
    const count = await lintWithRule(testCase.plugin, testCase.rule, path.join(dir, 'safe', testCase.safe));
    if (testCase.safeFixtureStillReports) {
      // Asserted to STILL be broken. When the rule learns to accept the real
      // remediation this flips to 0 and the test fails, which is the signal to
      // delete the entry — a recorded gap that cannot quietly become permanent.
      expect(count, `${testCase.rule} appears fixed — remove safeFixtureStillReports`).toBeGreaterThan(0);
      return;
    }
    expect(count).toBe(0);
  });
});

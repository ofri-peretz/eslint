/**
 * Dual-layer test suite for @interlace/eslint-formatter-sarif.
 *
 * Layer 1 — full pipeline: real ESLint `Linter.verify()` output (real parser,
 * real core rules, real autofix data, real fatal parse errors) fed through the
 * formatter, asserting on the emitted SARIF v2.1.0 document.
 * (This package is a formatter, not a rule, so the RuleTester analog is the
 * real Linter producing genuine LintMessage objects.)
 *
 * Layer 2 — raw unit tests: helpers imported directly and exercised with
 * synthetic inputs, plus fs-mocked module re-imports for the package-version
 * fallback branches that cannot fail in a healthy checkout.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';

import sarifFormatter, {
  readPackageVersion,
  severityToSarifLevel,
  ruleToReportingDescriptor,
  messageToSarifResult,
  pathToFileUri,
  buildToolExecutionNotifications,
} from './index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG_VERSION = JSON.parse(
  fs.readFileSync(path.join(HERE, '..', 'package.json'), 'utf8'),
).version;

/** Build an ESLint-shaped result object for a file. */
function makeResult(filePath, messages) {
  return {
    filePath,
    messages,
    errorCount: messages.filter((m) => m.severity === 2).length,
    warningCount: messages.filter((m) => m.severity === 1).length,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Layer 1 — real ESLint pipeline
// ───────────────────────────────────────────────────────────────────────────

describe('Layer 1: SARIF output from real ESLint Linter results', () => {
  const linter = new Linter();

  it('emits a valid SARIF run for real prefer-const (fixable, error) and no-unused-vars (warning) messages', () => {
    const fixableFile = path.join(process.cwd(), 'lib', 'fixable.js');
    const unusedFile = path.join(process.cwd(), 'lib', 'unused.js');

    const fixableMessages = linter.verify(
      'let x = 1;\nconsole.log(x);\n',
      { rules: { 'prefer-const': 'error' } },
      fixableFile,
    );
    const unusedMessages = linter.verify(
      'var neverUsed = 42;\n',
      { rules: { 'no-unused-vars': 'warn' } },
      unusedFile,
    );

    // Sanity: the real parser/rules produced what we expect to format.
    expect(fixableMessages).toHaveLength(1);
    expect(fixableMessages[0].ruleId).toBe('prefer-const');
    expect(fixableMessages[0].fix).toBeDefined();
    expect(unusedMessages).toHaveLength(1);
    expect(unusedMessages[0].ruleId).toBe('no-unused-vars');
    expect(unusedMessages[0].severity).toBe(1);

    const rulesMeta = {
      'prefer-const': {
        docs: {
          description: 'Require `const` declarations for variables that are never reassigned',
          url: 'https://eslint.org/docs/latest/rules/prefer-const',
          recommended: false,
          category: 'suggestion',
        },
      },
      // no-unused-vars deliberately missing from rulesMeta → `rulesMeta[id] ?? {}` fallback.
    };

    const output = sarifFormatter(
      [makeResult(fixableFile, fixableMessages), makeResult(unusedFile, unusedMessages)],
      { rulesMeta, cwd: process.cwd() },
    );
    const sarif = JSON.parse(output);

    expect(sarif.$schema).toBe('https://json.schemastore.org/sarif-2.1.0.json');
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs).toHaveLength(1);

    const run = sarif.runs[0];
    expect(run.tool.driver.name).toBe('Interlace ESLint');
    expect(run.tool.driver.informationUri).toBe('https://github.com/ofri-peretz/eslint');
    expect(run.tool.driver.version).toBe(PKG_VERSION);
    expect(run.tool.driver.semanticVersion).toBe(PKG_VERSION);
    expect(run.originalUriBaseIds.PROJECTROOT.uri.endsWith('/')).toBe(true);

    // Rules are sorted lexicographically.
    expect(run.tool.driver.rules.map((r) => r.id)).toEqual(['no-unused-vars', 'prefer-const']);

    // Rule with provided meta gets docs surfaces; the missing-meta rule falls back to its id.
    const preferConst = run.tool.driver.rules[1];
    expect(preferConst.shortDescription.text).toBe(
      'Require `const` declarations for variables that are never reassigned',
    );
    expect(preferConst.helpUri).toBe('https://eslint.org/docs/latest/rules/prefer-const');
    expect(preferConst.help).toEqual({
      text: 'https://eslint.org/docs/latest/rules/prefer-const',
      markdown: '[Documentation](https://eslint.org/docs/latest/rules/prefer-const)',
    });
    expect(preferConst.properties.tags).toEqual(['eslint', 'suggestion']);
    const noUnusedVars = run.tool.driver.rules[0];
    expect(noUnusedVars.shortDescription.text).toBe('no-unused-vars');
    expect(noUnusedVars.helpUri).toBeUndefined();
    expect(noUnusedVars.help).toBeUndefined();

    // Results: real message content, severity mapping, real regions.
    expect(run.results).toHaveLength(2);
    const [errorResult, warningResult] = run.results;

    expect(errorResult.ruleId).toBe('prefer-const');
    expect(errorResult.level).toBe('error');
    expect(errorResult.message.text).toBe(fixableMessages[0].message);
    const region = errorResult.locations[0].physicalLocation.region;
    expect(region.startLine).toBe(fixableMessages[0].line);
    expect(region.startColumn).toBe(fixableMessages[0].column);
    expect(region.endLine).toBe(fixableMessages[0].endLine);
    expect(region.endColumn).toBe(fixableMessages[0].endColumn);
    expect(errorResult.locations[0].physicalLocation.artifactLocation).toEqual({
      uri: 'lib/fixable.js',
      uriBaseId: 'PROJECTROOT',
    });

    // The real autofix is translated into a SARIF fix with exact char offsets.
    expect(errorResult.fixes).toHaveLength(1);
    const replacement = errorResult.fixes[0].artifactChanges[0].replacements[0];
    expect(replacement.deletedRegion.charOffset).toBe(fixableMessages[0].fix.range[0]);
    expect(replacement.deletedRegion.charLength).toBe(
      fixableMessages[0].fix.range[1] - fixableMessages[0].fix.range[0],
    );
    expect(replacement.insertedContent.text).toBe(fixableMessages[0].fix.text);

    expect(warningResult.ruleId).toBe('no-unused-vars');
    expect(warningResult.level).toBe('warning');
    expect(warningResult.fixes).toBeUndefined();

    // Clean run → successful invocation, no notifications.
    expect(run.invocations).toEqual([
      { executionSuccessful: true, toolExecutionNotifications: [] },
    ]);
  });

  it('routes a real fatal parse error to toolExecutionNotifications and marks the invocation failed', () => {
    const brokenFile = path.join(process.cwd(), 'lib', 'broken.js');
    const messages = linter.verify('let let = ;', {}, brokenFile);

    expect(messages).toHaveLength(1);
    expect(messages[0].fatal).toBe(true);
    expect(messages[0].ruleId).toBeNull();

    const sarif = JSON.parse(sarifFormatter([makeResult(brokenFile, messages)], {}));
    const run = sarif.runs[0];

    // Parse errors are not results — they are execution notifications.
    expect(run.results).toEqual([]);
    expect(run.tool.driver.rules).toEqual([]);
    expect(run.invocations[0].executionSuccessful).toBe(false);

    const notifications = run.invocations[0].toolExecutionNotifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].level).toBe('error');
    expect(notifications[0].message.text).toBe(messages[0].message);
    expect(notifications[0].locations[0].physicalLocation.artifactLocation.uri).toBe(
      'lib/broken.js',
    );
    expect(notifications[0].locations[0].physicalLocation.region).toEqual({
      startLine: messages[0].line,
      startColumn: messages[0].column,
    });
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Layer 2 — direct unit tests of helpers
// ───────────────────────────────────────────────────────────────────────────

describe('severityToSarifLevel', () => {
  it('maps 2 → error, 1 → warning, everything else → none', () => {
    expect(severityToSarifLevel(2)).toBe('error');
    expect(severityToSarifLevel(1)).toBe('warning');
    expect(severityToSarifLevel(0)).toBe('none');
    expect(severityToSarifLevel(undefined)).toBe('none');
  });
});

describe('readPackageVersion', () => {
  it('reads the actual package version from disk', () => {
    expect(readPackageVersion()).toBe(PKG_VERSION);
  });
});

describe('ruleToReportingDescriptor', () => {
  it('produces a minimal descriptor when meta is omitted entirely (default parameter)', () => {
    const d = ruleToReportingDescriptor('no-eval');
    expect(d.id).toBe('no-eval');
    expect(d.name).toBe('no-eval'); // no plugin prefix to strip
    expect(d.shortDescription).toEqual({ text: 'no-eval' });
    expect(d.fullDescription).toEqual({ text: 'no-eval' });
    expect(d.helpUri).toBeUndefined();
    expect(d.help).toBeUndefined();
    expect(d.defaultConfiguration).toEqual({ level: 'warning' }); // defaultSeverity ?? 1
    expect(d.properties).toEqual({ tags: ['eslint'] });
  });

  it('strips the plugin prefix from the descriptor name', () => {
    const d = ruleToReportingDescriptor('@interlace/secure-coding/no-eval-injection', {});
    expect(d.id).toBe('@interlace/secure-coding/no-eval-injection');
    expect(d.name).toBe('no-eval-injection');
  });

  it('maps meta-level Interlace surfaces (scalar cwe) and defaultSeverity 2 → error', () => {
    const meta = {
      cwe: 'CWE-79',
      cvss: 7.5,
      severity: 'high',
      asvs: 'V5.3.3',
      ssdf: 'PW.5.1',
      capec: 'CAPEC-63',
      cveExamples: ['CVE-2021-23337'],
      defaultSeverity: 2,
    };
    const d = ruleToReportingDescriptor('xss/no-inner-html', meta);
    expect(d.properties.cwe).toBe('CWE-79');
    expect(d.properties.cvss).toBe(7.5);
    expect(d.properties['interlace.severity']).toBe('high');
    expect(d.properties['interlace.asvs']).toBe('V5.3.3');
    expect(d.properties['interlace.ssdf']).toBe('PW.5.1');
    expect(d.properties['interlace.capec']).toBe('CAPEC-63');
    expect(d.properties['interlace.cveExamples']).toEqual(['CVE-2021-23337']);
    // Scalar CWE is wrapped, lowercased, and tagged GHAS-style.
    expect(d.properties.tags).toEqual(['eslint', 'external/cwe/cwe-79']);
    expect(d.defaultConfiguration).toEqual({ level: 'error' });
    // No docs at all → descriptions fall back to the rule id.
    expect(d.shortDescription.text).toBe('xss/no-inner-html');
  });

  it('falls back to docs-level surfaces (array cwe), category/recommended tags, and doc links', () => {
    const meta = {
      docs: {
        description: 'Disallow SQL string concatenation',
        url: 'https://example.com/rules/no-sql-concat',
        category: 'security',
        recommended: true,
        cwe: ['CWE-89', 'CWE-943'],
        cvss: 9.8,
        severity: 'critical',
        asvs: 'V5.3.4',
        ssdf: 'PW.8.2',
        capec: 'CAPEC-66',
        cveExamples: 'CVE-2020-7471',
      },
    };
    const d = ruleToReportingDescriptor('pg/no-sql-concat', meta);
    expect(d.name).toBe('no-sql-concat');
    expect(d.shortDescription.text).toBe('Disallow SQL string concatenation');
    expect(d.fullDescription.text).toBe('Disallow SQL string concatenation');
    expect(d.helpUri).toBe('https://example.com/rules/no-sql-concat');
    expect(d.help.markdown).toBe('[Documentation](https://example.com/rules/no-sql-concat)');
    expect(d.properties.cwe).toEqual(['CWE-89', 'CWE-943']);
    expect(d.properties.cvss).toBe(9.8);
    expect(d.properties['interlace.severity']).toBe('critical');
    expect(d.properties['interlace.asvs']).toBe('V5.3.4');
    expect(d.properties['interlace.ssdf']).toBe('PW.8.2');
    expect(d.properties['interlace.capec']).toBe('CAPEC-66');
    expect(d.properties['interlace.cveExamples']).toBe('CVE-2020-7471');
    // Array CWE → one tag per entry; category + recommended tags included.
    expect(d.properties.tags).toEqual([
      'eslint',
      'security',
      'external/cwe/cwe-89',
      'external/cwe/cwe-943',
      'recommended',
    ]);
  });

  it('prefers meta-level values over docs-level values when both are present', () => {
    const d = ruleToReportingDescriptor('dual/source', {
      cwe: 'CWE-1',
      docs: { cwe: 'CWE-2', cvss: 5.0 },
    });
    expect(d.properties.cwe).toBe('CWE-1'); // meta wins the ?? chain
    expect(d.properties.cvss).toBe(5.0); // docs fills the gap
  });
});

describe('messageToSarifResult', () => {
  it('returns null for messages without a ruleId (parse errors)', () => {
    expect(messageToSarifResult({ ruleId: null, fatal: true, message: 'x' }, 'a.js')).toBeNull();
  });

  it('defaults line/column to 1 and omits end positions and fixes when absent', () => {
    const r = messageToSarifResult(
      { ruleId: 'r1', severity: 1, message: 'msg' },
      path.join(process.cwd(), 'a.js'),
    );
    expect(r.level).toBe('warning');
    expect(r.locations[0].physicalLocation.region).toEqual({ startLine: 1, startColumn: 1 });
    expect(r.fixes).toBeUndefined();
    expect(r.locations[0].physicalLocation.artifactLocation.uri).toBe('a.js');
  });

  it('emits full region and a SARIF fix with computed offsets; missing fix text becomes empty insertion', () => {
    const message = {
      ruleId: 'r2',
      severity: 2,
      message: 'bad',
      line: 3,
      column: 5,
      endLine: 3,
      endColumn: 9,
      fix: { range: [10, 14] }, // no `text` → insertedContent ''
    };
    const r = messageToSarifResult(message, path.join(process.cwd(), 'b.js'));
    expect(r.level).toBe('error');
    expect(r.locations[0].physicalLocation.region).toEqual({
      startLine: 3,
      startColumn: 5,
      endLine: 3,
      endColumn: 9,
    });
    expect(r.fixes[0].description.text).toBe('ESLint auto-fix');
    expect(r.fixes[0].artifactChanges[0].replacements[0]).toEqual({
      deletedRegion: { charOffset: 10, charLength: 4 },
      insertedContent: { text: '' },
    });
  });
});

describe('pathToFileUri', () => {
  it('returns empty string for falsy paths', () => {
    expect(pathToFileUri('')).toBe('');
    expect(pathToFileUri(undefined)).toBe('');
  });

  it('converts paths inside cwd to forward-slash relative URIs', () => {
    const abs = path.join(process.cwd(), 'src', 'deep', 'file.js');
    expect(pathToFileUri(abs)).toBe('src/deep/file.js');
  });

  it('keeps paths outside cwd as-is (forward-slashed)', () => {
    expect(pathToFileUri('/definitely/not/under/cwd/file.js')).toBe(
      '/definitely/not/under/cwd/file.js',
    );
  });
});

describe('buildToolExecutionNotifications', () => {
  it('skips rule messages, non-fatal rule-less messages, and files without messages', () => {
    const results = [
      { filePath: 'a.js' }, // messages undefined → ?? [] branch
      {
        filePath: 'b.js',
        messages: [
          { ruleId: 'no-eval', severity: 2, message: 'rule hit' }, // ruleId → continue
          { ruleId: null, severity: 1, message: 'suppressed thing' }, // no fatal → skipped
        ],
      },
    ];
    expect(buildToolExecutionNotifications(results)).toEqual([]);
  });

  it('emits an error notification per fatal message, defaulting message/line/column', () => {
    const bare = { ruleId: null, fatal: true }; // no message/line/column
    const full = {
      ruleId: null,
      fatal: true,
      message: 'Unexpected token }',
      line: 7,
      column: 2,
    };
    const out = buildToolExecutionNotifications([
      { filePath: path.join(process.cwd(), 'bad.js'), messages: [bare, full] },
    ]);
    expect(out).toEqual([
      {
        level: 'error',
        message: { text: 'fatal parse error' },
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri: 'bad.js', uriBaseId: 'PROJECTROOT' },
              region: { startLine: 1, startColumn: 1 },
            },
          },
        ],
      },
      {
        level: 'error',
        message: { text: 'Unexpected token }' },
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri: 'bad.js', uriBaseId: 'PROJECTROOT' },
              region: { startLine: 7, startColumn: 2 },
            },
          },
        ],
      },
    ]);
  });
});

describe('sarifFormatter defaults and synthetic edge inputs', () => {
  it('formats an empty result set with no context argument at all (default parameter path)', () => {
    const sarif = JSON.parse(sarifFormatter([]));
    const run = sarif.runs[0];
    expect(run.results).toEqual([]);
    expect(run.tool.driver.rules).toEqual([]);
    // cwd relative to itself → '' + '/' — documents the uriBaseId shape.
    expect(run.originalUriBaseIds.PROJECTROOT.uri).toBe('/');
    expect(run.invocations[0].executionSuccessful).toBe(true);
    expect(run.invocations[0].toolExecutionNotifications).toEqual([]);
  });

  it('tolerates results whose messages array is missing', () => {
    const sarif = JSON.parse(sarifFormatter([{ filePath: 'a.js' }], {}));
    expect(sarif.runs[0].results).toEqual([]);
    expect(sarif.runs[0].invocations[0].executionSuccessful).toBe(true);
  });

  it('deduplicates rule ids across files and uses context.cwd for the uri base', () => {
    const msg = { ruleId: 'dup/rule', severity: 2, message: 'dup', line: 1, column: 1 };
    const sarif = JSON.parse(
      sarifFormatter(
        [makeResult('a.js', [msg]), makeResult('b.js', [{ ...msg }])],
        { rulesMeta: { 'dup/rule': { docs: { description: 'Duplicated rule' } } }, cwd: '/outside/base' },
      ),
    );
    const run = sarif.runs[0];
    expect(run.results).toHaveLength(2);
    expect(run.tool.driver.rules).toHaveLength(1);
    expect(run.tool.driver.rules[0].shortDescription.text).toBe('Duplicated rule');
    expect(run.originalUriBaseIds.PROJECTROOT.uri).toBe('/outside/base/');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Layer 2 — fs-mocked module re-imports for readPackageVersion fallbacks
// ───────────────────────────────────────────────────────────────────────────

describe('readPackageVersion fallbacks (mocked node:fs)', () => {
  afterEach(() => {
    vi.doUnmock('node:fs');
    vi.resetModules();
  });

  it('falls back to 0.0.0 when package.json cannot be read (catch branch)', async () => {
    vi.resetModules();
    vi.doMock('node:fs', () => {
      const readFileSync = () => {
        throw new Error('EACCES: permission denied');
      };
      return { default: { readFileSync }, readFileSync };
    });
    const mod = await import('./index.mjs');
    expect(mod.readPackageVersion()).toBe('0.0.0');
    // The module-level FORMATTER_VERSION also picked up the fallback.
    const sarif = JSON.parse(mod.default([]));
    expect(sarif.runs[0].tool.driver.version).toBe('0.0.0');
    expect(sarif.runs[0].tool.driver.semanticVersion).toBe('0.0.0');
  });

  it('falls back to 0.0.0 when package.json has no version field (?? branch)', async () => {
    vi.resetModules();
    vi.doMock('node:fs', () => {
      const readFileSync = () => '{"name":"@interlace/eslint-formatter-sarif"}';
      return { default: { readFileSync }, readFileSync };
    });
    const mod = await import('./index.mjs');
    expect(mod.readPackageVersion()).toBe('0.0.0');
    const sarif = JSON.parse(mod.default([]));
    expect(sarif.runs[0].tool.driver.version).toBe('0.0.0');
  });
});

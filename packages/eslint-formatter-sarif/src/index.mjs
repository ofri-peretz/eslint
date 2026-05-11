/**
 * SARIF v2.1.0 formatter for ESLint — roadmap item 1.2.
 *
 * Implements the OASIS SARIF Static Analysis Results Interchange Format so
 * Interlace findings can be ingested by GitHub Advanced Security, Microsoft
 * Defender, GitLab Ultimate, Azure DevOps, Snyk, Sonar, and any SAST pipeline
 * that speaks the standard. SARIF emission is the table-stakes credibility
 * gate before MITRE CWE Compatibility (item 1.8), differential benchmarking
 * (item 1.9), and the public ILB leaderboard (item 3.1).
 *
 * Usage from CLI:
 *   npx eslint -f @interlace/eslint-formatter-sarif src/ > out.sarif
 *
 * Usage programmatically:
 *   import sarifFormatter from '@interlace/eslint-formatter-sarif';
 *   const sarif = sarifFormatter(results, { rulesMeta });
 *
 * Spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/os/sarif-v2.1.0-os.html
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const SARIF_SCHEMA_URI = 'https://json.schemastore.org/sarif-2.1.0.json';
const SARIF_VERSION = '2.1.0';

function readPackageVersion() {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(fs.readFileSync(path.join(here, '..', 'package.json'), 'utf8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const FORMATTER_VERSION = readPackageVersion();

/**
 * Map ESLint severity (1 warn / 2 error) to SARIF level.
 * SARIF levels: none | note | warning | error.
 */
function severityToSarifLevel(severity) {
  if (severity === 2) return 'error';
  if (severity === 1) return 'warning';
  return 'none';
}

/**
 * Convert an ESLint rule's metadata block into a SARIF reportingDescriptor.
 * Includes Interlace-specific fields (cwe, cvss, asvs, ssdf, capec) under
 * the `properties` bag so downstream tooling can pivot on them.
 */
function ruleToReportingDescriptor(ruleId, meta = {}) {
  const docs = meta.docs ?? {};
  const properties = {};

  // Map common Interlace rule.meta surfaces into SARIF properties.
  if (meta.cwe || docs.cwe) properties.cwe = meta.cwe ?? docs.cwe;
  if (meta.cvss || docs.cvss) properties.cvss = meta.cvss ?? docs.cvss;
  if (meta.severity || docs.severity) properties['interlace.severity'] = meta.severity ?? docs.severity;
  if (meta.asvs || docs.asvs) properties['interlace.asvs'] = meta.asvs ?? docs.asvs;
  if (meta.ssdf || docs.ssdf) properties['interlace.ssdf'] = meta.ssdf ?? docs.ssdf;
  if (meta.capec || docs.capec) properties['interlace.capec'] = meta.capec ?? docs.capec;
  if (meta.cveExamples || docs.cveExamples) properties['interlace.cveExamples'] = meta.cveExamples ?? docs.cveExamples;

  // SARIF tags surface in GitHub Advanced Security as filters.
  const tags = ['eslint'];
  if (docs.category) tags.push(docs.category);
  if (properties.cwe) {
    const cweArr = Array.isArray(properties.cwe) ? properties.cwe : [properties.cwe];
    for (const c of cweArr) tags.push(`external/cwe/${String(c).toLowerCase()}`);
  }
  if (docs.recommended) tags.push('recommended');
  properties.tags = tags;

  return {
    id: ruleId,
    name: ruleId.replace(/^.*\//, ''),
    shortDescription: { text: docs.description ?? ruleId },
    fullDescription: { text: docs.description ?? ruleId },
    helpUri: docs.url ?? undefined,
    help: docs.url ? { text: docs.url, markdown: `[Documentation](${docs.url})` } : undefined,
    defaultConfiguration: {
      level: severityToSarifLevel(meta.defaultSeverity ?? 1),
    },
    properties,
  };
}

/**
 * Build a SARIF `result` object from a single ESLint message.
 */
function messageToSarifResult(message, filePath) {
  if (!message.ruleId) {
    // Parse errors and other non-rule diagnostics — emit as toolExecutionNotifications instead
    return null;
  }

  const result = {
    ruleId: message.ruleId,
    level: severityToSarifLevel(message.severity),
    message: { text: message.message },
    locations: [
      {
        physicalLocation: {
          artifactLocation: {
            uri: pathToFileUri(filePath),
            uriBaseId: 'PROJECTROOT',
          },
          region: {
            startLine: message.line ?? 1,
            startColumn: message.column ?? 1,
            ...(message.endLine ? { endLine: message.endLine } : {}),
            ...(message.endColumn ? { endColumn: message.endColumn } : {}),
          },
        },
      },
    ],
  };

  if (message.fix) {
    result.fixes = [
      {
        description: { text: 'ESLint auto-fix' },
        artifactChanges: [
          {
            artifactLocation: { uri: pathToFileUri(filePath), uriBaseId: 'PROJECTROOT' },
            replacements: [
              {
                deletedRegion: { charOffset: message.fix.range[0], charLength: message.fix.range[1] - message.fix.range[0] },
                insertedContent: { text: message.fix.text ?? '' },
              },
            ],
          },
        ],
      },
    ];
  }

  return result;
}

function pathToFileUri(p) {
  if (!p) return '';
  // Prefer relative paths; SARIF consumers (GHAS) expect uriBaseId-relative URIs.
  const cwd = process.cwd();
  const rel = path.relative(cwd, p);
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
    return rel.split(path.sep).join('/');
  }
  return p.split(path.sep).join('/');
}

function buildToolExecutionNotifications(results) {
  const notifications = [];
  for (const r of results) {
    for (const m of r.messages ?? []) {
      if (m.ruleId) continue; // Already handled as a result
      if (m.fatal) {
        notifications.push({
          level: 'error',
          message: { text: m.message ?? 'fatal parse error' },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: pathToFileUri(r.filePath), uriBaseId: 'PROJECTROOT' },
              region: { startLine: m.line ?? 1, startColumn: m.column ?? 1 },
            },
          }],
        });
      }
    }
  }
  return notifications;
}

/**
 * ESLint formatter entry point. ESLint passes:
 *   - `results`  : array of per-file lint results
 *   - `context`  : object with `cwd`, `rulesMeta`, etc. (since ESLint 8.4)
 */
export default function sarifFormatter(results, context = {}) {
  const rulesMeta = context.rulesMeta ?? {};
  const ruleIds = new Set();
  const sarifResults = [];

  for (const r of results) {
    for (const m of r.messages ?? []) {
      const sr = messageToSarifResult(m, r.filePath);
      if (sr) {
        sarifResults.push(sr);
        ruleIds.add(m.ruleId);
      }
    }
  }

  // oxlint-disable-next-line no-array-sort
  const rules = [...ruleIds].sort().map((id) => ruleToReportingDescriptor(id, rulesMeta[id] ?? {}));

  const sarif = {
    $schema: SARIF_SCHEMA_URI,
    version: SARIF_VERSION,
    runs: [
      {
        tool: {
          driver: {
            name: 'Interlace ESLint',
            informationUri: 'https://github.com/ofri-peretz/eslint',
            rules,
            version: FORMATTER_VERSION,
            semanticVersion: FORMATTER_VERSION,
          },
        },
        originalUriBaseIds: {
          PROJECTROOT: { uri: pathToFileUri(context.cwd ?? process.cwd()) + '/' },
        },
        invocations: [
          {
            executionSuccessful: results.every((r) => (r.messages ?? []).every((m) => !m.fatal)),
            toolExecutionNotifications: buildToolExecutionNotifications(results),
          },
        ],
        results: sarifResults,
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}

// README structure gate for packages/eslint-plugin-* README.md files.
//
// Enforces the canonical structure codified in
// .agent/rules/readme-structure.md. Fail-fast: any violation exits non-zero
// with a per-plugin report.
//
// Validates: required sections present in canonical order; Interlace logo +
// standard badge row in the prelude; identical Philosophy paragraph; exactly
// one rule-data table under the Rules heading with the brain type-aware
// column populated for every row; no legacy "Set towarn" typo; no stray
// AUTO-GENERATED markers above the Rules heading.

import fs from 'fs';
import path from 'path';

const packagesDir = path.join(process.cwd(), 'packages');

const packages = fs
  .readdirSync(packagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((n) => n.startsWith('eslint-plugin-'));

// Canonical section order — every README must contain these headers in this
// relative order. Optional sections (FAQ, Supported Libraries, Test Coverage,
// AI-Optimized Messages, etc.) are not asserted by this gate; they're allowed
// anywhere between Configuration Presets and Rules per the structure rule.
const REQUIRED_ORDER = [
  '## Description',
  '## Philosophy',
  '## Getting Started',
  '## ⚙️ Configuration Presets',
  '## 📦 Compatibility',
  '## Rules',
  '## 🔗 Related ESLint Plugins',
  '## 📄 License',
];

const PHILOSOPHY_FINGERPRINT =
  'Interlace** fosters **strength through integration';

interface Violation {
  pkg: string;
  reasons: string[];
}

function checkPlugin(pkg: string): Violation | null {
  const readmePath = path.join(packagesDir, pkg, 'README.md');
  if (!fs.existsSync(readmePath)) {
    return { pkg, reasons: ['README.md missing'] };
  }
  const content = fs.readFileSync(readmePath, 'utf8');
  const reasons: string[] = [];

  // 1. Required sections in canonical order.
  let cursor = 0;
  for (const header of REQUIRED_ORDER) {
    const idx = content.indexOf(header, cursor);
    if (idx === -1) {
      reasons.push(`missing or out-of-order section: \`${header}\``);
      cursor = -1;
      break;
    }
    cursor = idx + header.length;
  }

  // 2. Prelude: logo + standard badges (HTML form, not markdown linked image).
  if (!content.includes('eslint-interlace-logo-light.svg')) {
    reasons.push('missing Interlace logo in prelude');
  }
  if (
    !content.includes('img.shields.io/npm/v/') ||
    !content.includes('img.shields.io/badge/License-MIT')
  ) {
    reasons.push('missing standard NPM/License badges in prelude');
  }

  // 3. Philosophy paragraph matches the canonical text.
  if (!content.includes(PHILOSOPHY_FINGERPRINT)) {
    reasons.push('Philosophy paragraph does not match the canonical Interlace text');
  }

  // 4. Exactly one canonical 11-column rule-data table under `## Rules`.
  //    Only tables whose header lists the canonical column set count — that
  //    way Parity / Compatibility tables that happen to start with `| Rule |`
  //    don't trigger the "duplicate" check.
  const rulesHeaderIdx = content.indexOf('## Rules');
  const canonicalHeader =
    '| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |';
  const ruleTableRegex =
    /\| Rule \| CWE \| OWASP \| CVSS \| Description \| 🧠 \| 💼 \| ⚠️ \| 🔧 \| 💡 \| 🚫 \|\n\|[\s:|\\\-]+\|\n(?:\|[^\n]*\|\n?)+/g;
  const ruleTableMatches = [...content.matchAll(ruleTableRegex)];
  if (ruleTableMatches.length === 0) {
    reasons.push(`no canonical rule-data table found (expected header: \`${canonicalHeader}\`)`);
  } else if (ruleTableMatches.length > 1) {
    reasons.push(
      `expected exactly 1 rule-data table, found ${ruleTableMatches.length} (duplicate generator run?)`,
    );
  } else if (rulesHeaderIdx !== -1 && ruleTableMatches[0].index! < rulesHeaderIdx) {
    reasons.push(
      'rule-data table sits above `## Rules` (auto-migration may have wrapped the wrong table)',
    );
  } else {
    // 5. Every data row populates the 🧠 cell with a known glyph. The header
    //    is guaranteed canonical by the regex above, so we go straight to
    //    cell-level validation.
    const dataRows = ruleTableMatches[0][0]
      .split('\n')
      .slice(2) // skip header + alignment
      .filter((l) => l.startsWith('| ['));
    const bad: string[] = [];
    for (const row of dataRows) {
      // 🧠 is the 6th data cell (index 5 after stripping the leading + trailing
      // empties produced by `|`-split).
      const cells = row.split('|').slice(1, -1).map((c) => c.trim());
      const brain = cells[5];
      if (!brain || !/^(🟢|🟡|🟠)$/.test(brain)) {
        const ruleMatch = row.match(/\[([a-z0-9-]+)\]/);
        bad.push(ruleMatch ? ruleMatch[1] : '(unknown)');
      }
    }
    if (bad.length > 0) {
      reasons.push(
        `🧠 column is empty / invalid for ${bad.length} rule(s): ${bad.slice(0, 5).join(', ')}${bad.length > 5 ? '…' : ''}`,
      );
    }
  }

  // 7. Legacy "Set towarn" typo must be gone.
  if (content.includes('Set towarn')) {
    reasons.push('legacy `Set towarn` typo in legend (should be `Set to warn`)');
  }

  // 8. Stray AUTO-GENERATED markers outside `## Rules` body.
  const autoGenMarkers = [
    ...content.matchAll(/<!-- AUTO-GENERATED:RULES_TABLE:(START|END)[^\n]*-->/g),
  ];
  if (autoGenMarkers.length > 0) {
    if (rulesHeaderIdx === -1) {
      reasons.push('AUTO-GENERATED markers present but `## Rules` is missing');
    } else {
      for (const m of autoGenMarkers) {
        if (m.index! < rulesHeaderIdx) {
          reasons.push(
            'AUTO-GENERATED:RULES_TABLE marker sits above `## Rules` — generator wrapped the wrong table',
          );
          break;
        }
      }
    }
  }

  return reasons.length > 0 ? { pkg, reasons } : null;
}

console.log('🔍 Verifying README structure for all plugins...');

const violations = packages
  .map(checkPlugin)
  .filter((v): v is Violation => v !== null);

if (violations.length > 0) {
  for (const v of violations) {
    console.error(`❌ [${v.pkg}]`);
    for (const r of v.reasons) {
      console.error(`   - ${r}`);
    }
  }
  console.error(`\n💥 README structure verification failed (${violations.length} plugin(s)).`);
  process.exit(1);
} else {
  console.log(`\n✅ All ${packages.length} READMEs follow the canonical structure.`);
}

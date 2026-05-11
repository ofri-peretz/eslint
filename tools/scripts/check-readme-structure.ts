/**
 * README structure gate for `packages/eslint-plugin-*/README.md`.
 *
 * Enforces the canonical structure codified in
 * `.agent/rules/readme-structure.md`. Fail-fast: if any check fails the
 * process exits non-zero with a per-plugin violation report.
 *
 * Validates:
 *   - Required sections present in canonical order.
 *   - Interlace logo + standard badge row in the prelude.
 *   - Identical Philosophy paragraph.
 *   - Exactly one rule-data table (Rule-header + alignment + body),
 *     under `## Rules`, with the 🧠 type-aware column.
 *   - Every rule row populates the 🧠 column.
 *   - No legacy `Set towarn` typo.
 *   - No leftover AUTO-GENERATED markers outside of `## Rules`.
 */

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
  '## Rules',
  '## 🔗 Related ESLint Plugins',
  '## 📦 Compatibility',
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

  // 4. Exactly one rule-data table (header + alignment + at least one row),
  //    and it must sit under `## Rules`.
  const ruleTableRegex =
    /\|\s*Rule\s*\|[^\n]*\n\|[\s:|\\\-]+\|\n(?:\|[^\n]*\|\n?)+/g;
  const ruleTableMatches = [...content.matchAll(ruleTableRegex)];
  const rulesHeaderIdx = content.indexOf('## Rules');
  if (ruleTableMatches.length === 0) {
    reasons.push('no rule-data table found');
  } else if (ruleTableMatches.length > 1) {
    reasons.push(
      `expected exactly 1 rule-data table, found ${ruleTableMatches.length} (duplicate generator run?)`,
    );
  } else if (rulesHeaderIdx !== -1 && ruleTableMatches[0].index! < rulesHeaderIdx) {
    reasons.push(
      'rule-data table sits above `## Rules` (auto-migration may have wrapped the wrong table)',
    );
  } else {
    // 5. Rule-table header includes the 🧠 column.
    const header = ruleTableMatches[0][0].split('\n')[0];
    if (!header.includes('🧠')) {
      reasons.push('rule-data table is missing the 🧠 (type-aware) column');
    } else {
      // 6. Every data row populates the 🧠 cell with a known glyph.
      const dataRows = ruleTableMatches[0][0]
        .split('\n')
        .slice(2) // skip header + alignment
        .filter((l) => l.startsWith('| ['));
      const bad: string[] = [];
      for (const row of dataRows) {
        // The 🧠 cell is the 6th column (index 5 in pipe-split, 1-based after
        // the leading empty cell). Pull all cells and check.
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

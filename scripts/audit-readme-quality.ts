#!/usr/bin/env npx tsx
/**
 * README Quality Standards Audit Script
 *
 * Checks all ESLint plugin READMEs against QUALITY_STANDARDS.md requirements.
 * Based on Section 4: Documentation Standards
 */

import * as fs from 'fs';
import * as path from 'path';

interface QualityChecks {
  conciseHeadline: boolean;
  badgesNpm: boolean;
  badgesCodecov: boolean;
  whatYouGet: boolean;
  owaspMatrix: boolean;
  rulesTableCWE: boolean;
  quickStart: boolean;
  relatedPackages: boolean;
  fullMetadataTable: boolean;
  presetsTable: boolean;
}

const packagesDir = path.join(__dirname, '..', 'packages');

// Get all eslint-plugin directories
const plugins = fs
  .readdirSync(packagesDir)
  .filter((dir) => dir.startsWith('eslint-plugin'))
  .filter((dir) => {
    const readmePath = path.join(packagesDir, dir, 'README.md');
    return fs.existsSync(readmePath);
  });

console.log('📋 README Quality Standards Audit\n');
console.log('='.repeat(60));
console.log();

const results: Record<string, QualityChecks> = {};

for (const plugin of plugins) {
  const readmePath = path.join(packagesDir, plugin, 'README.md');
  const content = fs.readFileSync(readmePath, 'utf8');

  results[plugin] = {
    // 1. Concise headline (blockquote after title)
    conciseHeadline: /^#\s+eslint-plugin-[\w-]+\s*\n\n>\s+.+/m.test(content),

    // 2. Badges section (npm and codecov)
    badgesNpm: /\[!\[npm/.test(content) || /\[!\[npm version\]/.test(content),
    badgesCodecov: /\[!\[codecov/.test(content),

    // 3. What you get section
    whatYouGet:
      /##\s+💡?\s*What [Yy]ou [Gg]et/i.test(content) ||
      /##\s+🎯?\s*What [Yy]ou [Gg]et/i.test(content),

    // 4. OWASP Coverage Matrix
    owaspMatrix:
      /##\s+.*(OWASP\s+(Coverage|Top\s+10|Serverless\s+Top\s+10))/i.test(
        content
      ),

    // 5. Rules table with CWE column
    rulesTableCWE: /\|\s*CWE\s*\|/i.test(content) || /CWE-\d+/.test(content),

    // 6. Quick Start section
    quickStart: /##\s+.*Quick\s+Start/i.test(content),

    // 7. Related Packages section
    relatedPackages:
      /##\s+.*Related\s+(Packages|Plugins|ESLint\s+Plugins)/i.test(content),

    // Optional: Full metadata table format (💼, 🔧, 💡)
    fullMetadataTable:
      /💼|🔧|💡/.test(content) && /\|\s*Rule\s*\|/.test(content),

    // Optional: Presets table
    presetsTable: /##\s+.*Presets/i.test(content),
  };
}

// Print results
for (const [plugin, checks] of Object.entries(results)) {
  console.log(`### ${plugin}`);
  console.log(`- Concise headline: ${checks.conciseHeadline ? '✅' : '❌'}`);
  console.log(
    `- Badges (npm/codecov): ${checks.badgesNpm && checks.badgesCodecov ? '✅' : '❌'}`
  );
  console.log(`- What you get section: ${checks.whatYouGet ? '✅' : '❌'}`);
  console.log(`- OWASP Coverage Matrix: ${checks.owaspMatrix ? '✅' : '❌'}`);
  console.log(`- Rules table with CWE: ${checks.rulesTableCWE ? '✅' : '❌'}`);
  console.log(`- Quick Start: ${checks.quickStart ? '✅' : '❌'}`);
  console.log(`- Related Packages: ${checks.relatedPackages ? '✅' : '❌'}`);
  console.log(
    `- Full metadata table (💼🔧💡): ${checks.fullMetadataTable ? '✅' : '❌'}`
  );
  console.log();
}

// Summary
console.log('='.repeat(60));
console.log('📊 SUMMARY\n');

const requiredChecks: (keyof QualityChecks)[] = [
  'conciseHeadline',
  'badgesNpm',
  'badgesCodecov',
  'whatYouGet',
  'owaspMatrix',
  'rulesTableCWE',
  'quickStart',
  'relatedPackages',
  'fullMetadataTable',
];

interface FailingPlugin {
  plugin: string;
  failing: string[];
}

const failingPlugins: FailingPlugin[] = [];

for (const [plugin, checks] of Object.entries(results)) {
  const failing = requiredChecks.filter((check) => {
    if (check === 'badgesNpm' || check === 'badgesCodecov') {
      return !checks.badgesNpm || !checks.badgesCodecov;
    }
    return !checks[check];
  });

  if (failing.length > 0) {
    failingPlugins.push({
      plugin,
      failing: [
        ...new Set(
          failing.map((f) =>
            f === 'badgesNpm' || f === 'badgesCodecov' ? 'badges' : f
          )
        ),
      ],
    });
  }
}

if (failingPlugins.length === 0) {
  console.log('✅ All plugins pass quality standards!');
} else {
  console.log(`❌ ${failingPlugins.length} plugin(s) need updates:\n`);
  for (const { plugin, failing } of failingPlugins) {
    console.log(`  ${plugin}:`);
    for (const check of [...new Set(failing)]) {
      console.log(`    - Missing: ${check}`);
    }
  }
}

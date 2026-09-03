/**
 * Generate test fixtures for benchmarks
 * Usage: node scripts/generate-fixtures.js [benchmark-name] [--all]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
// Suites live in `suites/`, not `benchmarks/` — this pointed at a directory
// that has never existed, so generated fixtures landed where run-benchmark.js
// does not look and the synthetic suite could not be reproduced from source.
const BENCHMARKS_DIR = path.join(ROOT_DIR, 'suites');

// Generator key -> suite directory under `suites/`. Without this the `import`
// generator writes to `suites/import/`, while the runner reads
// `suites/ilb-perf-import/`.
const SUITE_DIRS = {
  import: 'ilb-perf-import',
  shapes: 'ilb-perf-import',
  security: 'ilb-cwe-corpus',
};

// Fixture generators for each benchmark type
const GENERATORS = {
  import: generateImportFixtures,
  security: generateSecurityFixtures,
  shapes: generateShapeFixtures,
};

const SIZES = {
  import: [1000, 5000, 10000],
  security: [1000, 5000],
  // Graph *shapes*, not sizes. The `import` fixtures above are a single shape —
  // a deep linear chain — which is the best case for a plugin that amortizes
  // traversal across files. These cover the shapes that are worst for us, so
  // "faster than the official plugin" can be claimed over a matrix rather than
  // over one favourable graph. All hold file count at 5,000 except `single`.
  shapes: ['chain-5000', 'wide-5000', 'flat-5000', 'dense-5000', 'single'],
};

// Parse CLI args
const args = process.argv.slice(2);
const benchmarkName = args.find(a => !a.startsWith('--'));
const runAll = args.includes('--all');

async function main() {
  console.log('🔨 Fixture Generator\n');

  const toGenerate = runAll 
    ? Object.keys(GENERATORS) 
    : benchmarkName 
      ? [benchmarkName] 
      : [];

  if (toGenerate.length === 0) {
    console.log('Usage: node scripts/generate-fixtures.js [benchmark] [--all]');
    console.log('\nAvailable generators:');
    Object.keys(GENERATORS).forEach(g => console.log(`  - ${g}`));
    process.exit(1);
  }

  for (const name of toGenerate) {
    const generator = GENERATORS[name];
    const sizes = SIZES[name] || [1000];
    
    if (!generator) {
      console.log(`❌ Unknown benchmark: ${name}`);
      continue;
    }

    const fixturesDir = path.join(BENCHMARKS_DIR, SUITE_DIRS[name] ?? name, 'fixtures');
    
    for (const size of sizes) {
      await generator(fixturesDir, size);
    }
  }

  console.log('\n🎉 All fixtures generated!');
}

// ============ Import Fixtures ============

function generateImportFixtures(baseDir, size) {
  const dir = path.join(baseDir, String(size));
  
  console.log(`\n📁 Generating import fixtures: ${size.toLocaleString()} files...`);
  
  // Clean existing
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
  fs.mkdirSync(dir, { recursive: true });

  const startTime = Date.now();
  
  for (let i = 0; i < size; i++) {
    const content = generateImportFile(i, size);
    fs.writeFileSync(path.join(dir, `file${i}.js`), content);
    
    if ((i + 1) % 1000 === 0) {
      process.stdout.write(`   ${i + 1} files\r`);
    }
  }
  
  // Generate barrel file
  fs.writeFileSync(path.join(dir, 'index.js'), generateBarrelFile(size));
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ ${size.toLocaleString()} import files in ${duration}s`);
}

function generateImportFile(index, total) {
  const externalImports = [
    `import { useState, useEffect } from 'react';`,
    `import axios from 'axios';`,
    `import { get, debounce } from 'lodash';`,
  ].slice(0, (index % 3) + 1).join('\n');

  const localImports = [];
  if (index > 0) localImports.push(`import { helper${index - 1} } from './file${index - 1}.js';`);
  if (index > 5) localImports.push(`import { util${index - 5} } from './file${index - 5}.js';`);
  if (index % 10 === 0 && index > 0) localImports.push(`import * as barrel from './index.js';`);

  return `${externalImports}
${localImports.join('\n')}

export const helper${index} = () => 'helper ${index}';
export const util${index} = (d) => d.map(x => x * 2);
export default function main${index}() { return { helper: helper${index}() }; }
`;
}

function generateBarrelFile(count) {
  const exports = [];
  for (let i = 0; i < Math.min(count, 100); i++) {
    exports.push(`export { helper${i}, util${i} } from './file${i}.js';`);
  }
  return exports.join('\n');
}

// ============ Shape Fixtures ============

/**
 * Emit one graph shape. `shape` is "<name>-<count>" (or "single").
 *
 * Each shape stresses a different part of cycle detection:
 *
 * - chain  — file[i] imports file[i-1] and file[i-5]; depth ~= count.
 *            Same shape as the `import` fixtures. Deep traversal, heavily
 *            amortizable. Our best case; included so the matrix has its
 *            own baseline rather than referencing another suite.
 * - wide   — 5,000 leaves over a 20-module core; depth 2. Nothing to
 *            amortize, so per-file setup cost is the whole story.
 * - flat   — no local imports at all. Pure per-file overhead with no graph;
 *            isolates fixed cost from traversal cost.
 * - dense  — 1,000 mutually-importing clusters of 5. Maximum number of
 *            distinct SCCs, so the cycle-reporting path dominates.
 * - single — one file importing one other. The cold editor-on-save case,
 *            where a shared cache has exactly one file to amortize over.
 */
function generateShapeFixtures(baseDir, shape) {
  const dir = path.join(baseDir, String(shape));
  const [name, countRaw] = String(shape).split('-');
  const count = countRaw ? parseInt(countRaw, 10) : 1;

  console.log(`\n📁 Generating shape fixture: ${shape}...`);

  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
  fs.mkdirSync(dir, { recursive: true });

  const startTime = Date.now();
  const write = (i, body) =>
    fs.writeFileSync(path.join(dir, `file${i}.js`), body);
  const decl = i =>
    `export const helper${i} = () => 'helper ${i}';\nexport default function main${i}() { return helper${i}(); }\n`;

  switch (name) {
    case 'chain':
      for (let i = 0; i < count; i++) {
        const imports = [];
        if (i > 0) imports.push(`import { helper${i - 1} } from './file${i - 1}.js';`);
        if (i > 5) imports.push(`import { helper${i - 5} } from './file${i - 5}.js';`);
        write(i, `${imports.join('\n')}\n${decl(i)}`);
      }
      break;

    case 'wide': {
      // 20 core modules; every other file imports two of them. Depth 2.
      const core = 20;
      for (let i = 0; i < core; i++) write(i, decl(i));
      for (let i = core; i < count; i++) {
        const a = i % core;
        // Offset is in [1, core-1] so b !== a. Importing the same module twice
        // would re-declare the binding and turn the file into a parse error,
        // which silently removes it from cycle analysis.
        const b = (a + 1 + (i % (core - 1))) % core;
        write(
          i,
          `import { helper${a} } from './file${a}.js';\n` +
            `import { helper${b} } from './file${b}.js';\n${decl(i)}`
        );
      }
      break;
    }

    case 'flat':
      for (let i = 0; i < count; i++) {
        write(i, `import { useState } from 'react';\n${decl(i)}`);
      }
      break;

    case 'dense': {
      // Clusters of 5, each a complete cycle: every member imports every other.
      const clusterSize = 5;
      for (let i = 0; i < count; i++) {
        const base = Math.floor(i / clusterSize) * clusterSize;
        const imports = [];
        for (let j = base; j < base + clusterSize; j++) {
          if (j !== i && j < count) {
            imports.push(`import { helper${j} } from './file${j}.js';`);
          }
        }
        write(i, `${imports.join('\n')}\n${decl(i)}`);
      }
      break;
    }

    case 'single':
      write(0, `import { helper1 } from './file1.js';\n${decl(0)}`);
      write(1, decl(1));
      break;

    default:
      console.log(`❌ Unknown shape: ${name}`);
      return;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ ${shape} in ${duration}s`);
}

// ============ Security Fixtures ============

function generateSecurityFixtures(baseDir, size) {
  const dir = path.join(baseDir, String(size));
  
  console.log(`\n📁 Generating security fixtures: ${size.toLocaleString()} files...`);
  
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
  fs.mkdirSync(dir, { recursive: true });

  const startTime = Date.now();
  
  for (let i = 0; i < size; i++) {
    const content = generateSecurityFile(i);
    fs.writeFileSync(path.join(dir, `file${i}.js`), content);
    
    if ((i + 1) % 1000 === 0) {
      process.stdout.write(`   ${i + 1} files\r`);
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ ${size.toLocaleString()} security files in ${duration}s`);
}

function generateSecurityFile(index) {
  // Mix of secure and vulnerable patterns
  const patterns = [
    // Secure patterns
    `const query = db.query('SELECT * FROM users WHERE id = $1', [userId]);`,
    `const hash = crypto.createHash('sha256').update(data).digest('hex');`,
    `const token = crypto.randomBytes(32).toString('hex');`,
    // Patterns plugins should catch
    `const userInput = req.query.name;`,
    `const result = eval(expression);`,  // 1 in 5 files
    `const password = "secretpassword123";`,  // 1 in 10 files
  ];

  const code = [];
  code.push(`// File ${index}`);
  code.push(`import { db } from './db.js';`);
  code.push(`import crypto from 'crypto';`);
  code.push('');
  
  // Add 3-5 patterns per file
  const numPatterns = 3 + (index % 3);
  for (let i = 0; i < numPatterns; i++) {
    const patternIndex = (index + i) % patterns.length;
    code.push(patterns[patternIndex]);
  }

  code.push('');
  code.push(`export function process${index}(data) { return data; }`);

  return code.join('\n');
}

main();

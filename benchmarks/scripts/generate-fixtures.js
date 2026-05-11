/**
 * Generate test fixtures for benchmarks
 * Usage: node scripts/generate-fixtures.js [benchmark-name] [--all]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const BENCHMARKS_DIR = path.join(ROOT_DIR, 'benchmarks');

// Fixture generators for each benchmark type
const GENERATORS = {
  import: generateImportFixtures,
  security: generateSecurityFixtures,
};

const SIZES = {
  import: [1000, 5000, 10000],
  security: [1000, 5000],
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

    const fixturesDir = path.join(BENCHMARKS_DIR, name, 'fixtures');
    
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

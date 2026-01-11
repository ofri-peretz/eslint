import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = path.resolve(process.cwd(), '../../');
const packagesDir = path.join(rootDir, 'packages');

function countRules() {
  try {
    const result = execSync(
      `find ${packagesDir} -name "rules" -type d -exec find {} -name "*.ts" ! -name "*.test.ts" \\; | wc -l`,
      { encoding: 'utf8' }
    );
    return parseInt(result.trim(), 10);
  } catch (e) {
    console.warn('Could not count rules from filesystem, using fallback');
    return 482;
  }
}

function countPlugins() {
  try {
    const result = execSync(
      `find ${packagesDir} -maxdepth 1 -name "eslint-plugin-*" -type d | wc -l`,
      { encoding: 'utf8' }
    );
    return parseInt(result.trim(), 10);
  } catch (e) {
    console.warn('Could not count plugins from filesystem, using fallback');
    return 15;
  }
}

async function fetchCodecov() {
  try {
    const response = await fetch('https://codecov.io/api/v2/github/ofri-peretz/repos/eslint/');
    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();
    return data.totals.coverage;
  } catch (e) {
    console.error('Failed to fetch Codecov stats:', e);
    return 81.65;
  }
}

async function main() {
  const stats = {
    rules: countRules(),
    plugins: countPlugins(),
    coverage: await fetchCodecov(),
    lastUpdated: new Date().toISOString()
  };

  const outputPath = path.resolve(process.cwd(), 'src/data/stats.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2));
  console.log('Stats synchronized successfully:', stats);
}

main();

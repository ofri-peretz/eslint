const fs = require('fs');
const coveragePath = 'packages/eslint-plugin-secure-coding/coverage/coverage-final.json';

try {
  const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  console.log('Coverage Summary (Low Statements):');
  Object.keys(coverage).forEach(file => {
    const data = coverage[file];
    const statements = data.s;
    const total = Object.keys(statements).length;
    const covered = Object.values(statements).filter(v => v > 0).length;
    const pct = total === 0 ? 100 : (covered / total) * 100;
    
    if (pct < 90) { // arbitrary threshold
      console.log(`${file}: ${pct.toFixed(2)}% (${covered}/${total})`);
    }
  });
} catch (e) {
  console.error('Error reading coverage:', e);
}

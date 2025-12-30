import * as fs from 'node:fs';
import * as path from 'node:path';

const demoDir = path.resolve(__dirname, '../../../playground/apps/demo-app/src/examples/import-next');
const rulesDir = path.resolve(__dirname, '../src/rules');

// Get rules from file system
const rules = fs.readdirSync(rulesDir)
  .filter(file => file.endsWith('.ts') && !file.includes('index') && !file.includes('.d.ts'))
  .map(file => path.basename(file, '.ts'));

if (!fs.existsSync(demoDir)) {
  fs.mkdirSync(demoDir, { recursive: true });
}

rules.forEach(ruleName => {
  const ruleDir = path.join(demoDir, ruleName);
  if (!fs.existsSync(ruleDir)) {
    fs.mkdirSync(ruleDir, { recursive: true });
    
    // Create valid.ts
    fs.writeFileSync(path.join(ruleDir, 'valid.ts'), `// Valid example for ${ruleName}\\nexport const valid = true;\\n`);
    
    // Create invalid.ts
    fs.writeFileSync(path.join(ruleDir, 'invalid.ts'), `// Invalid example for ${ruleName}\\n// TODO: Add failing code\\nexport const invalid = true;\\n`);
    
    console.log(`Created examples for ${ruleName}`);
  }
});

#!/usr/bin/env node

/**
 * Rule Documentation Compliance Validator
 * Scans all rule docs and reports compliance issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all rule docs
const ruleDocsGlob = execSync('find packages -name "*.md" -path "*/docs/rules/*"', { encoding: 'utf-8' });
const ruleDocs = ruleDocsGlob.trim().split('\n').filter(Boolean);

console.log(`📊 Scanning ${ruleDocs.length} rule documentation files...\n`);

const issues = [];
let compliantCount = 0;

ruleDocs.forEach((filePath, index) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const ruleName = path.basename(filePath, '.md');
  const plugin = filePath.match(/eslint-plugin-([^/]+)/)?.[1] || 'unknown';
  
  const ruleIssues = [];
  
  // Check 1: Has title matching filename
  const titleMatch = content.match(/^# (.+)/m);
  if (!titleMatch || titleMatch[1] !== ruleName) {
    ruleIssues.push('Title mismatch or missing');
  }
  
  // Check 2: Has description blockquote
  if (!content.match(/^>\s*.+/m)) {
    ruleIssues.push('Missing description blockquote');
  }
  
  // Check 3: Has Incorrect examples section
  if (!content.match(/##\s*❌\s*(Incorrect|Incorrect Code)/i)) {
    ruleIssues.push('Missing "❌ Incorrect" section');
  }
  
  // Check 4: Has Correct examples section
  if (!content.match(/##\s*✅\s*(Correct|Correct Code)/i)) {
    ruleIssues.push('Missing "✅ Correct" section');
  }
  
  // Check 5: Has Known False Negatives
  if (!content.match(/##\s*Known False Negatives/i)) {
    ruleIssues.push('Missing "Known False Negatives" section');
  }
  
  // Check 6: Has code examples (at least 2)
  const codeBlocks = content.match(/```(?:typescript|javascript)/g);
  if (!codeBlocks || codeBlocks.length < 2) {
    ruleIssues.push(`Only ${codeBlocks?.length || 0} code examples (need 2+)`);
  }
  
  // Check 7: Has placeholder/stub content
  const placeholderPatterns = [
    /insecure pattern/i,
    /secure pattern/i,
    /TODO:/i,
    /Add specific examples/i,
    /security rule for/i,
    /CWE-000/i,
    /Example of .* detected by this rule/i
  ];
  if (placeholderPatterns.some(pattern => content.match(pattern))) {
    ruleIssues.push('Contains placeholder/stub content');
  }
  
  // Check 8: Has security standard (CWE or OWASP)
  if (!content.match(/CWE-\d+/i) && !content.match(/OWASP/i)) {
    ruleIssues.push('Missing security standard (CWE/OWASP)');
  }
  
  if (ruleIssues.length > 0) {
    issues.push({
      plugin,
      ruleName,
      filePath,
      issues: ruleIssues,
      severity: ruleIssues.includes('Contains placeholder/stub content') ? 'HIGH' : 'MEDIUM'
    });
  } else {
    compliantCount++;
  }
});

// Generate report
console.log(`✅ Compliant: ${compliantCount}/${ruleDocs.length}`);
console.log(`❌ Issues Found: ${issues.length}\n`);

if (issues.length > 0) {
  // Group by severity
  const high = issues.filter(i => i.severity === 'HIGH');
  const medium = issues.filter(i => i.severity === 'MEDIUM');
  
  console.log(`\n🔴 HIGH PRIORITY (${high.length}) - Stub/Placeholder Content:\n`);
  high.forEach(issue => {
    console.log(`  ${issue.plugin}/${issue.ruleName}`);
    issue.issues.forEach(i => console.log(`    - ${i}`));
    console.log();
  });
  
  console.log(`\n🟡 MEDIUM PRIORITY (${medium.length}) - Formatting/Structure:\n`);
  medium.slice(0, 20).forEach(issue => {
    console.log(`  ${issue.plugin}/${issue.ruleName}: ${issue.issues.join(', ')}`);
  });
  
  if (medium.length > 20) {
    console.log(`\n  ... and ${medium.length - 20} more\n`);
  }
  
  // Write detailed report
  const reportPath = '.agent/rule-docs-validation-report.md';
  const report = `# Rule Documentation Validation Report

**Generated:** ${new Date().toISOString()}
**Total Rules:** ${ruleDocs.length}
**Compliant:** ${compliantCount}
**Issues:** ${issues.length}

## 🔴 HIGH PRIORITY - Stub/Placeholder Content (${high.length})

${high.map(issue => `### ${issue.plugin}/${issue.ruleName}

**File:** \`${issue.filePath}\`

**Issues:**
${issue.issues.map(i => `- ${i}`).join('\n')}

`).join('\n')}

## 🟡 MEDIUM PRIORITY - Formatting/Structure (${medium.length})

${medium.map(issue => `- **${issue.plugin}/${issue.ruleName}**: ${issue.issues.join(', ')}`).join('\n')}
`;

  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Full report saved to: ${reportPath}\n`);
}

process.exit(issues.length > 0 ? 1 : 0);

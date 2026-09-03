
import * as fs from 'node:fs';
import * as path from 'node:path';
import plugin from '../src/index';

const RULES_DIR = path.resolve(__dirname, '../docs/rules');

if (!fs.existsSync(RULES_DIR)) {
  fs.mkdirSync(RULES_DIR, { recursive: true });
}

// Map rules to OWASP categories if known (or default)
const OWASP_MAP: Record<string, string> = {
  'no-cycle': 'A05:2021 - Security Misconfiguration',
  'no-unresolved': 'A03:2021 - Injection',
  'no-deprecated': 'A09:2021 - Security Logging and Monitoring Failures', // Loosely
  // Add others as reasonable defaults or generic
};

Object.entries(plugin.rules).forEach(([ruleName, rule]: [string, any]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const meta = rule.meta || {};
  const docs = meta.docs || {};
  const description = docs.description || 'No description provided.';
  
  const content = `
# ${ruleName}

💼 This rule is enabled in the following configs: \`recommended\`, \`typescript\`.
💡 This rule is automatically fixable by the \`--fix\` CLI option.

<!-- end auto-generated rule header -->

${description}

## Rule Details

This rule aims to prevent issues related to ${ruleName.replace('no-', '')}.

## Options

\`\`\`json
${JSON.stringify(meta.schema || {}, null, 2)}
\`\`\`

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/${ruleName}.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/${ruleName}.test.ts)

## OWASP Foundation

- **Category**: ${OWASP_MAP[ruleName] || 'A00:2021 - General Security'}
  `;

  fs.writeFileSync(path.join(RULES_DIR, `${ruleName}.md`), content.trim() + '\n');
  console.log(`Generated docs/rules/${ruleName}.md`);
});

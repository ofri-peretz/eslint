#!/usr/bin/env node

/**
 * Generate plugin index pages with proper badges and accessibility.
 */

import * as fs from 'fs';
import * as path from 'path';

interface PluginInfo {
  name: string;
  description: string;
  ruleCount: number;
  codecovComponent: string; // Codecov component name for badge
}

const PLUGINS: Record<string, PluginInfo> = {
  'secure-coding': {
    name: 'eslint-plugin-secure-coding',
    description: 'Comprehensive security rules with full OWASP Top 10 Web & Mobile coverage',
    ruleCount: 75,
    codecovComponent: 'secure_coding',
  },
  pg: {
    name: 'eslint-plugin-pg',
    description: 'PostgreSQL node-postgres security rules with SQL injection detection',
    ruleCount: 13,
    codecovComponent: 'pg',
  },
  jwt: {
    name: 'eslint-plugin-jwt',
    description: 'JWT security rules for jsonwebtoken, jose, and jwt-decode',
    ruleCount: 13,
    codecovComponent: 'jwt',
  },
  crypto: {
    name: 'eslint-plugin-crypto',
    description: 'Cryptographic security rules for Node.js crypto and Web Crypto API',
    ruleCount: 24,
    codecovComponent: 'crypto',
  },
  'express-security': {
    name: 'eslint-plugin-express-security',
    description: 'Express.js security rules for CORS, headers, cookies, and CSRF',
    ruleCount: 9,
    codecovComponent: 'express_security',
  },
  'nestjs-security': {
    name: 'eslint-plugin-nestjs-security',
    description: 'NestJS security rules for guards, validation, and throttler',
    ruleCount: 5,
    codecovComponent: 'nestjs_security',
  },
  'lambda-security': {
    name: 'eslint-plugin-lambda-security',
    description: 'AWS Lambda security rules for API Gateway and Middy middleware',
    ruleCount: 5,
    codecovComponent: 'lambda_security',
  },
  'browser-security': {
    name: 'eslint-plugin-browser-security',
    description: 'Browser security rules for XSS, CSRF, and client-side vulnerabilities',
    ruleCount: 21,
    codecovComponent: 'browser_security',
  },
  'mongodb-security': {
    name: 'eslint-plugin-mongodb-security',
    description: 'MongoDB and Mongoose security rules for NoSQL injection prevention',
    ruleCount: 16,
    codecovComponent: 'mongodb_security',
  },
  'vercel-ai-security': {
    name: 'eslint-plugin-vercel-ai-security',
    description: 'AI/LLM security rules for Vercel AI SDK and OpenAI integration',
    ruleCount: 19,
    codecovComponent: 'vercel_ai_security',
  },
  'import-next': {
    name: 'eslint-plugin-import-next',
    description: 'Import analysis and architecture rules for modern JavaScript',
    ruleCount: 56,
    codecovComponent: 'import_next',
  },
};

const ROOT_DIR = path.join(__dirname, '..');
const DOCS_CONTENT_DIR = path.join(ROOT_DIR, 'apps', 'docs', 'content', 'docs');

function generatePluginPage(slug: string, plugin: PluginInfo): string {
  const importName = slug.replace(/-/g, '');
  
  return `---
title: ${plugin.name}
description: ${plugin.description}
---

# ${plugin.name}

[![npm version](https://img.shields.io/npm/v/${plugin.name}.svg)](https://www.npmjs.com/package/${plugin.name}) [![npm downloads](https://img.shields.io/npm/dm/${plugin.name}.svg)](https://www.npmjs.com/package/${plugin.name}) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=${plugin.codecovComponent})](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=${plugin.codecovComponent})

<Callout type="info">
  **${plugin.ruleCount} specialized rules** — LLM-optimized error messages with CWE, OWASP, and CVSS metadata.
</Callout>

## Installation

\`\`\`bash
npm install --save-dev ${plugin.name}
\`\`\`

## Configuration

\`\`\`js title="eslint.config.js"
import ${importName} from '${plugin.name}';

export default [${importName}.configs.recommended];
\`\`\`

## Available Presets

| Preset | Description |
|--------|-------------|
| \`recommended\` | Balanced security for most projects |
| \`strict\` | Maximum enforcement (all rules as errors) |

## Rules

Browse all ${plugin.ruleCount} rules in the sidebar, or see the [Rules section](/docs/${slug}/rules).

<Cards>
  <Card title="Browse All Rules" href="/docs/${slug}/rules" />
</Cards>

## Related Articles

<RelatedArticles plugin="${slug}" limit={3} />
`;
}

function main(): void {
  console.log('🔄 Regenerating ALL plugin index pages with badges...\\n');

  for (const [slug, plugin] of Object.entries(PLUGINS)) {
    const pluginDir = path.join(DOCS_CONTENT_DIR, slug);
    const indexPath = path.join(pluginDir, 'index.mdx');

    // Ensure directory exists
    if (!fs.existsSync(pluginDir)) {
      fs.mkdirSync(pluginDir, { recursive: true });
    }

    // Generate content (overwrite existing)
    const content = generatePluginPage(slug, plugin);
    fs.writeFileSync(indexPath, content);

    // Generate meta.json for navigation
    const metaPath = path.join(pluginDir, 'meta.json');
    fs.writeFileSync(
      metaPath,
      JSON.stringify({ title: plugin.name.replace('eslint-plugin-', ''), pages: ['index', 'rules'] }, null, 2)
    );

    console.log(`✅ Generated ${slug}/index.mdx with badges`);
  }

  console.log('\\n✨ Plugin page generation complete!');
}

main();

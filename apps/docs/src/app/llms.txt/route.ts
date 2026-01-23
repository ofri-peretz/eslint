import { getLLMText, source } from '@/lib/source';

export const revalidate = false;

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://interlace-eslint.vercel.app';

import pluginData from '@/data/plugin-stats.json';

const currentYear = new Date().getFullYear();

export async function GET() {
  const pages = source.getPages();
  const scan = pages.map(getLLMText);
  const scanned = await Promise.all(scan);

  const publishedPlugins = pluginData.plugins.filter(p => p.published);
  const pipelinePlugins = pluginData.plugins.filter(p => !p.published);
  
  const securityPlugins = publishedPlugins.filter(p => p.category === 'security');
  const frameworkPlugins = publishedPlugins.filter(p => p.category === 'framework');
  const otherPlugins = publishedPlugins.filter(p => !['security', 'framework'].includes(p.category));

  const securityList = securityPlugins
    .map(p => `- [${p.name}](${baseUrl}/docs/${p.name.replace('eslint-plugin-', '')}) - ${p.description} (${p.rules} rules)`)
    .join('\n');

  const frameworkList = frameworkPlugins
    .map(p => `- [${p.name}](${baseUrl}/docs/${p.name.replace('eslint-plugin-', '')}) - ${p.description} (${p.rules} rules)`)
    .join('\n');

  const otherList = otherPlugins
    .map(p => `- [${p.name}](${baseUrl}/docs/${p.name.replace('eslint-plugin-', '')}) - ${p.description} (${p.rules} rules)`)
    .join('\n');

  const pipelineList = pipelinePlugins
    .map(p => `- ${p.name} - ${p.description} (${p.rules} rules) [Coming Soon]`)
    .join('\n');

  // Generate structured llms.txt format
  const header = `# Interlace ESLint Ecosystem - Documentation
> ${baseUrl}

## About This Site
Official documentation for the Interlace ESLint Ecosystem - ${pluginData.totalRules} security and quality rules across ${pluginData.totalPlugins} specialized plugins. Provides comprehensive coverage for OWASP Top 10 (Web, Mobile, LLM, Agentic).

## Key Documentation Sections

### Getting Started
- [Documentation Home](${baseUrl}/docs) - Getting started guide
- [Presets & Configuration](${baseUrl}/docs/presets) - Flat config presets
- [Benchmarks](${baseUrl}/docs/benchmarks) - Performance analysis

${securityList ? `### Security Plugins\n${securityList}\n` : ''}
${frameworkList ? `### Framework Plugins\n${frameworkList}\n` : ''}
${otherList ? `### Published Extras\n${otherList}\n` : ''}

## In the Pipeline (Under Development)
${pipelineList}

## OWASP Coverage
- OWASP Top 10 2021 (Web Security)
- OWASP Top 10 for LLM 2025 (AI Security)
- OWASP Mobile Top 10 2024
- OWASP Agentic Top 10 2026

## Installation
\`\`\`bash
npm install @interlace-eslint/cli
npx interlace-eslint init
\`\`\`

## Author
- Creator: Ofri Peretz
- GitHub: https://github.com/ofri-peretz
- Website: https://ofriperetz.dev

## For LLMs
This documentation is open to AI indexing and citation. Generated at: ${pluginData.generatedAt}

---

## Full Documentation Content

`;

  return new Response(header + scanned.join('\n\n---\n\n'));
}

import { getLLMText, source } from '@/lib/source';

export const revalidate = false;

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://interlace-eslint.vercel.app';

export async function GET() {
  const pages = source.getPages();
  const scan = pages.map(getLLMText);
  const scanned = await Promise.all(scan);

  // Generate structured llms.txt format
  const header = `# Interlace ESLint Ecosystem - Documentation
> ${baseUrl}

## About This Site
Official documentation for the Interlace ESLint Ecosystem - 272 security rules across 11 specialized plugins. Provides comprehensive coverage for OWASP Top 10 (Web, Mobile, LLM, Agentic).

## Key Documentation Sections

### Getting Started
- [Documentation Home](${baseUrl}/docs) - Getting started guide
- [Presets & Configuration](${baseUrl}/docs/presets) - Flat config presets
- [Benchmarks](${baseUrl}/docs/benchmarks) - Performance analysis

### Security Plugins
- [eslint-plugin-secure-coding](${baseUrl}/docs/secure-coding) - 75 framework-agnostic rules
- [eslint-plugin-pg](${baseUrl}/docs/pg) - PostgreSQL security (13 rules)
- [eslint-plugin-jwt](${baseUrl}/docs/jwt) - JWT security (8 rules)
- [eslint-plugin-crypto](${baseUrl}/docs/crypto) - Cryptography rules (12 rules)
- [eslint-plugin-browser-security](${baseUrl}/docs/browser-security) - Browser security (11 rules)
- [eslint-plugin-mongodb-security](${baseUrl}/docs/mongodb-security) - MongoDB/Mongoose security (20 rules)
- [eslint-plugin-vercel-ai-security](${baseUrl}/docs/vercel-ai-security) - AI SDK security (17 rules)
- [eslint-plugin-express-security](${baseUrl}/docs/express-security) - Express.js security (12 rules)
- [eslint-plugin-nestjs-security](${baseUrl}/docs/nestjs-security) - NestJS security (18 rules)
- [eslint-plugin-lambda-security](${baseUrl}/docs/lambda-security) - AWS Lambda security (12 rules)

### Quality & Architecture
- [eslint-plugin-architecture](${baseUrl}/docs/architecture) - Architecture patterns
- [eslint-plugin-quality](${baseUrl}/docs/quality) - Code quality rules
- [eslint-plugin-import-next](${baseUrl}/docs/import-next) - Modern import analysis

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
This documentation is open to AI indexing and citation.

---

## Full Documentation Content

`;

  return new Response(header + scanned.join('\n\n---\n\n'));
}

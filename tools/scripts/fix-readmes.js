const fs = require('fs');
const path = require('path');

const packagesDir = path.join(process.cwd(), 'packages');

// Get all directories in packages/
const packages = fs.readdirSync(packagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => name.startsWith('eslint-plugin-'));

// Map of short specific descriptions
const DESCRIPTIONS = {
    'eslint-plugin-express-security': 'Comprehensive security rules for Express.js applications, mapping to OWASP Top 10.',
    'eslint-plugin-crypto': 'Cryptographic security rules enforcing best practices and modern standards (Node.js crypto).',
    'eslint-plugin-react-features': 'Advanced React patterns, hook usage, and best practices enforcement.',
    'eslint-plugin-nestjs-security': 'Security rules tailored for NestJS applications (Controllers, Providers, Decorators).',
    'eslint-plugin-jwt': 'Security validation for JSON Web Tokens (JWT) implementation (signing, verification).',
    'eslint-plugin-pg': 'Security rules for PostgreSQL interaction in Node.js (SQL injection prevention).',
    'eslint-plugin-browser-security': 'Browser-specific security rules to prevent XSS and other client-side attacks.',
    'eslint-plugin-lambda-security': 'Security best practices for AWS Lambda functions (IAM, timeouts, environment).',
    'eslint-plugin-secure-coding': 'General secure coding practices and OWASP compliance for JavaScript/TypeScript.',
    'eslint-plugin-vercel-ai-security': 'Security rules for Vercel AI SDK usage (prompt injection, data handling).',
    'eslint-plugin-import-next': 'Next-generation import sorting, validation, and architectural boundaries.',
    'eslint-plugin-mongodb-security': 'Security rules for MongoDB queries and interactions (NoSQL injection).',
    'eslint-plugin-quality': 'Code quality, maintainability standards, and cognitive complexity limits.',
    'eslint-plugin-react-a11y': 'Accessibility (a11y) rules for React applications, enforcing WCAG standards.',
    'eslint-plugin-architecture': 'Architectural boundaries, circular dependency detection, and module structure.'
};

const CVSS_MAP = {
    'no-insecure-rsa-padding': '7.4',
    'no-cryptojs-weak-random': '5.3',
    'require-secure-pbkdf2-digest': '9.1',
    'no-weak-hash-algorithm': '7.5',
    'no-weak-cipher-algorithm': '7.5',
    'no-deprecated-cipher-method': '5.0',
    'no-static-iv': '7.5',
    'no-ecb-mode': '7.5',
    'no-insecure-key-derivation': '7.5',
    'no-hardcoded-crypto-key': '9.8',
    'require-random-iv': '7.5',
    'no-math-random-crypto': '5.3',
    'no-predictable-salt': '7.5',
    'require-authenticated-encryption': '6.5',
    'no-key-reuse': '7.5',
    'no-self-signed-certs': '7.5',
    'no-timing-unsafe-compare': '5.9',
    'require-key-length': '7.5',
    'no-web-crypto-export': '5.0',
    'no-sha1-hash': '7.5',
    'require-sufficient-length': '7.5',
    'no-numeric-only-tokens': '5.3',
    'no-cryptojs': '5.0',
    'prefer-native-crypto': '5.0'
};

const PHILOSOPHY_TEXT = `## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.`;

const ECOSYSTEM_TABLE = `## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin | NPM | Downloads | License | Description |
| :--- | :---: | :---: | :---: | :--- |
| [\`eslint-plugin-secure-coding\`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![npm](https://img.shields.io/npm/v/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![license](https://img.shields.io/npm/l/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | General security rules & OWASP guidelines. |
| [\`eslint-plugin-pg\`](https://www.npmjs.com/package/eslint-plugin-pg) | [![npm](https://img.shields.io/npm/v/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | [![license](https://img.shields.io/npm/l/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | PostgreSQL security & best practices. |
| [\`eslint-plugin-crypto\`](https://www.npmjs.com/package/eslint-plugin-crypto) | [![npm](https://img.shields.io/npm/v/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | [![license](https://img.shields.io/npm/l/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | NodeJS Cryptography security rules. |
| [\`eslint-plugin-jwt\`](https://www.npmjs.com/package/eslint-plugin-jwt) | [![npm](https://img.shields.io/npm/v/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | [![license](https://img.shields.io/npm/l/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | JWT security & best practices. |
| [\`eslint-plugin-browser-security\`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | Browser-specific security & XSS prevention. |
| [\`eslint-plugin-vercel-ai-security\`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security rules. |
| [\`eslint-plugin-express-security\`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express.js security hardening rules. |
| [\`eslint-plugin-lambda-security\`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda security best practices. |
| [\`eslint-plugin-nestjs-security\`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS security rules & patterns. |
| [\`eslint-plugin-import-next\`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![npm](https://img.shields.io/npm/v/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | [![license](https://img.shields.io/npm/l/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Next-gen import sorting & architecture. |`;

packages.forEach(pkg => {
    const readmePath = path.join(packagesDir, pkg, 'README.md');
    if (!fs.existsSync(readmePath)) return;

    console.log(`Processing ${pkg}...`);
    let content = fs.readFileSync(readmePath, 'utf8');
    const lines = content.split('\n');
    const pluginName = pkg.replace('eslint-plugin-', '');
    const shortDesc = DESCRIPTIONS[pkg] || 'Security-focused ESLint plugin.';

    const docUrl = `https://eslint.interlace.tools/docs/${pluginName}`;
    const baseUrl = `https://eslint.interlace.tools`;

    // --- 1. EXTRACT DATA TO PRESERVE ---

    // A. Rules Table Rows
    // We look for rows that look like rule definitions, extracting them to rebuild the table.
    const ruleRows = [];
    const processedRules = new Set();
    
    // Regex strategies for extraction
    const ruleRowRegex = /^\|\s*\[?([a-zA-Z0-9\-\/]+)\]?.*\|.*$/;

    lines.forEach(line => {
        const match = line.match(ruleRowRegex);
        if (match && !line.includes('---') && !line.toLowerCase().includes('| rule |') && !line.toLowerCase().includes('| icon |')) {
             // It's likely a rule row.
             // We need to parse it to ensure it has all columns: Rule, CWE, OWASP, CVSS, Desc, Flags
             // If strict parsing fails, we try to salvage what we can or skip if it's garbage/header.
             
             // Check if it's already in processedRules (deduplication)
             const rawRuleName = match[1];
             if (processedRules.has(rawRuleName) || processedRules.has(`[${rawRuleName}]`)) return;
             if (rawRuleName === 'Rule' || rawRuleName === 'Plugin') return; // Skip header/misc rows mismatch
             
             // Extract Cells
             const parts = line.split('|').map(c => c.trim()).filter((c, i) => i !== 0 && i !== line.split('|').length - 1); // remove outer empty splits if | is at ends
             // Wait, split result for "| A | B |" is ["", " A ", " B ", ""]
             
             const cells = line.split('|').map(c => c.trim());
             // Remove empty start/end if they exist (markdown tables usually have leading/trailing pipes)
             if (cells[0] === '') cells.shift();
             if (cells[cells.length-1] === '') cells.pop();

             // Basic validation: needs at least Rule and Desc? 
             // Existing standard tables have ~10 columns.
             // If < 3, probably not a rule row.
             if (cells.length < 3) return;

             processedRules.add(rawRuleName);
             
             // Normalize Row Data
             // Enforce absolute documentation link
             const rule = `[${rawRuleName}](${docUrl}/rules/${rawRuleName})`;

             let cwe = cells.find(c => c.includes('CWE-')) || '';
             let owasp = cells.find(c => c.includes(':202')) || ''; // 2021 or 2025
             if (owasp) owasp = owasp.replace('2021', '2025');

             let cvss = cells.find(c => /^[0-9]\.[0-9]$/.test(c)) || '';
             // Fallback CVSS
             if (!cvss) {
                 const shortRuleName = rawRuleName.split('/').pop();
                 cvss = CVSS_MAP[shortRuleName] || '';
             }

             // Description: Find the longest cell that isn't the others
             const getWeight = (c) => {
                 if (c === rule) return -1;
                 if (c.includes('CWE-')) return -1;
                 if (c.includes(':202')) return -1;
                 if (/^[0-9]\.[0-9]$/.test(c)) return -1;
                 if (['💼','⚠️','🔧','💡','🚫'].includes(c)) return -1;
                 return c.length;
             };
             const desc = cells.reduce((prev, curr) => getWeight(curr) > getWeight(prev) ? curr : prev, '');

             const hasFlag = (icon) => cells.includes(icon) ? icon : '';
             
             ruleRows.push(`| ${rule} | ${cwe} | ${owasp} | ${cvss} | ${desc} | ${hasFlag('💼')} | ${hasFlag('⚠️')} | ${hasFlag('🔧')} | ${hasFlag('💡')} | ${hasFlag('🚫')} |`);
        }
    });

    // B. Custom Sections (Preserve "Usage Examples", "Configuration Presets", etc.)
    // We scan for ## headers that are NOT standard.
    // NOTE: 'Installation' and 'Getting Started' variants should be skipped to avoid duplication.
    const STANDARD_HEADERS = [
        '# ',
        '## Description',
        '## Philosophy',
        '## Getting Started',
        '## Rules',
        '## 🔗 Related ESLint Plugins', 
        '## 📄 License',
        '## License', // Legacy plain license header
        '## Documentation', // User wants to strip this in favor of standard Getting Started links
        '## Installation', // Legacy: we actively skip this later, but need to identify it as 'known' to not treat as custom
        '## 📦 Installation', // Also skip
        '## 🚀 Quick Start' // Keep this as a custom section we want to preserve? Or merge?
        // User wants LESS Getting Started. "Quick Start" might be redundant if we have Getting Started.
        // Let's treat "Getting Started" as the one truth. 
        // We will explicitly SKIP 'Installation' and 'Quick Start' if they contain just npm install.
    ];

    const customSections = [];
    let currentCustomSection = null;
    let capture = false;

    lines.forEach(line => {
        if (line.startsWith('## ')) {
            const trimmed = line.trim();
            // Check if it's one of our core generated sections
            const isCore = ['## Description', '## Philosophy', '## Getting Started', '## Rules', '## 🔗 Related ESLint Plugins', '## 📄 License'].includes(trimmed);
            
            // Check if it's a section we want to NUKE because it's redundant (Transformation 2026-01-11)
            const isLegacyInstallation = ['## Installation', '## 📦 Installation', '## 🚀 Quick Start'].some(h => trimmed.startsWith(h));

            if (isCore || isLegacyInstallation) {
                capture = false;
                currentCustomSection = null;
            } else {
                // It is a truly custom section (e.g. "Available Presets", "Supported Functions", "FAQ")
                currentCustomSection = { header: line, content: [] };
                customSections.push(currentCustomSection);
                capture = true;
            }
        } else if (capture && currentCustomSection) {
            currentCustomSection.content.push(line);
        }
    });

    // --- 2. RECONSTRUCT CONTENT ---

    const output = [];

    // 1. Header & Logo
    output.push(`# ${pkg}`);
    output.push('');
    output.push('<p align="center">');
    output.push(`  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>`);
    output.push('</p>');
    output.push('');
    output.push('<p align="center">');
    output.push(`  ${shortDesc}`);
    output.push('</p>');
    output.push('');

    // 2. Badges
    output.push('<p align="center">');
    output.push(`  <a href="https://www.npmjs.com/package/${pkg}" target="_blank"><img src="https://img.shields.io/npm/v/${pkg}.svg" alt="NPM Version" /></a>`);
    output.push(`  <a href="https://www.npmjs.com/package/${pkg}" target="_blank"><img src="https://img.shields.io/npm/dm/${pkg}.svg" alt="NPM Downloads" /></a>`);
    output.push(`  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>`);
    output.push(`  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=${pluginName}" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=${pluginName}" alt="Codecov" /></a>`);
    output.push(`  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white" alt="Dec 2025" /></a>`);
    output.push('</p>');
    output.push('');

    // 3. Description Section
    output.push('## Description');
    output.push('');
    output.push(shortDesc); // Use the text again as the main description, or elaborate? User said "adding description". The map text is good.
    output.push('');
    
    // 4. Philosophy
    output.push(PHILOSOPHY_TEXT);
    output.push('');

    // 5. Getting Started (SINGLE source of truth)
    output.push('## Getting Started');
    output.push('');
    output.push(`- To check out the [guide](${docUrl}), visit [eslint.interlace.tools](${baseUrl}). 📚`);
    output.push(`- 要查看中文 [指南](${docUrl}), 请访问 [eslint.interlace.tools](${baseUrl}). 📚`);
    output.push(`- [가이드](${docUrl}) 문서는 [eslint.interlace.tools](${baseUrl})에서 확인하실 수 있습니다. 📚`);
    output.push(`- [ガイド](${docUrl})は [eslint.interlace.tools](${baseUrl})でご確認ください。 📚`);
    output.push('');
    output.push('```bash');
    output.push(`npm install ${pkg} --save-dev`);
    output.push('```');
    output.push('');

    // 6. Custom Sections (Usage Examples, etc.)
    customSections.forEach(section => {
        // Filter out redundant documentation links if they sneaked into a custom section
        const filteredContent = section.content.filter(line => 
            !line.includes('[Rules Reference]') && 
            !line.includes('./docs/RULES.md')
        );
        
        if (filteredContent.length === 0 && section.header.includes('Documentation')) return;

        output.push(section.header);
        output.push(filteredContent.join('\n').trim());
        output.push('');
    });

    // 7. Rules Table
    if (ruleRows.length > 0) {
        output.push('## Rules');
        output.push('');
        output.push('**Legend**');
        output.push('');
        output.push('| Icon | Description |');
        output.push('| :---: | :--- |');
        output.push('| 💼 | **Recommended**: Included in the recommended preset. |');
        output.push('| ⚠️ | **Warns**: Set towarn in recommended preset. |');
        output.push('| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |');
        output.push('| 💡 | **Suggestions**: Providing code suggestions in IDE. |');
        output.push('| 🚫 | **Deprecated**: This rule is deprecated. |');
        output.push('');
        output.push('| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |');
        output.push('| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |');
        output.push(ruleRows.join('\n'));
        output.push('');
    }

    // 8. Ecosystem Table
    output.push(ECOSYSTEM_TABLE);
    output.push('');

    // 9. Footer Image
    // Use generic footer link
    output.push(`## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
`);
    output.push(`<p align="center">`);
    output.push(`  <a href="https://eslint.interlace.tools/docs/${pluginName}"><img src="https://eslint.interlace.tools/images/og-${pluginName}.png" alt="ESLint Interlace Plugin" width="100%" /></a>`);
    output.push(`</p>`);

    fs.writeFileSync(readmePath, output.join('\n'));
    console.log(`[${pkg}] Regenerated successfully.`);
});

const fs = require('fs');
const path = require('path');

const packagesDir = path.join(process.cwd(), 'packages');
const docsDir = path.join(process.cwd(), 'apps/docs/content/docs');

// Get all directories in packages/
const packages = fs.readdirSync(packagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => name.startsWith('eslint-plugin-'));

// Map of short specific descriptions for the Plugin itself
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
    'eslint-plugin-architecture': 'Architectural boundaries, circular dependency detection, and module structure.',
    'eslint-plugin-node-security': 'Security rules for Node.js core modules (fs, child_process, crypto, etc).'
};

// CVSS fallback map
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

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [\`eslint-plugin-secure-coding\`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | General security rules & OWASP guidelines. |
| [\`eslint-plugin-pg\`](https://www.npmjs.com/package/eslint-plugin-pg) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | PostgreSQL security & best practices. |
| [\`eslint-plugin-crypto\`](https://www.npmjs.com/package/eslint-plugin-crypto) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | NodeJS Cryptography security rules. |
| [\`eslint-plugin-jwt\`](https://www.npmjs.com/package/eslint-plugin-jwt) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | JWT security & best practices. |
| [\`eslint-plugin-browser-security\`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | Browser-specific security & XSS prevention. |
| [\`eslint-plugin-express-security\`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express.js security hardening rules. |
| [\`eslint-plugin-lambda-security\`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda security best practices. |
| [\`eslint-plugin-nestjs-security\`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS security rules & patterns. |
| [\`eslint-plugin-mongodb-security\`](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | MongoDB security best practices. |
| [\`eslint-plugin-vercel-ai-security\`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security hardening. |
| [\`eslint-plugin-import-next\`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Next-gen import sorting & architecture. |`;

// Categories for specific plugins
const CATEGORIES = {
   // 'eslint-plugin-secure-coding': { ... } DISABLED to enforce single table
};

/**
 * Find the documentation path for a plugin
 */
function findDocsPath(pluginName) {
    const name = pluginName.replace('eslint-plugin-', '');
    // Check known categories
    const categories = ['security', 'quality'];
    
    for (const cat of categories) {
        if (fs.existsSync(path.join(docsDir, cat, `plugin-${name}`))) {
             return `${cat}/plugin-${name}`;
        }
    }
    // Check root
    if (fs.existsSync(path.join(docsDir, `plugin-${name}`))) {
        return `plugin-${name}`;
    }
    // Fallback
    return name;
}

/**
 * Get description from MDX doc
 */
function getMdxDescription(docsSubPath, ruleName) {
    const mdxPath = path.join(docsDir, docsSubPath, 'rules', `${ruleName}.mdx`);
    if (fs.existsSync(mdxPath)) {
        const content = fs.readFileSync(mdxPath, 'utf8');
        // Simple frontmatter extraction if available, else first sentence
        const match = content.match(/description:\s*(.*)/i);
        if (match) {
            return match[1].trim().replace(/^['"]|['"]$/g, ''); // strip quotes
        }
    }
    return '';
}

packages.forEach(pkg => {
    const readmePath = path.join(packagesDir, pkg, 'README.md');
    if (!fs.existsSync(readmePath)) return;

    console.log(`Processing ${pkg}...`);
    let content = fs.readFileSync(readmePath, 'utf8');
    const lines = content.split('\n');
    const pluginName = pkg.replace('eslint-plugin-', '');
    const shortDesc = DESCRIPTIONS[pkg] || 'Security-focused ESLint plugin.';

    // Resolve Docs URL
    const docsSubPath = findDocsPath(pkg);
    const docUrl = `https://eslint.interlace.tools/docs/${docsSubPath}`;
    const baseUrl = `https://eslint.interlace.tools`;

    // --- 1. HARVEST METADATA from existing README ---
    // We scrape existing tables to preserve manual CWE/OWASP/CVSS tags
    const ruleMetadata = {};
    const ruleRowRegex = /^\|\s*\[?([a-zA-Z0-9\-\/]+)\]?.*\|.*$/;

    lines.forEach(line => {
        const match = line.match(ruleRowRegex);
        if (match && !line.includes('---')) {
             const rawRuleName = match[1].replace(/\[|\]/g, ''); // Clean logic
             // Extract Cells
             const cells = line.split('|').map(c => c.trim());
             if (cells.length < 3) return;
             
             // Extract Metadata
             let cwe = cells.find(c => c.includes('CWE-')) || '';
             let owasp = cells.find(c => c.includes(':202')) || '';
             if (owasp) owasp = owasp.replace('2021', '2025');
             let cvss = cells.find(c => /^[0-9]\.[0-9]$/.test(c)) || '';
             
             // Flags
             const flags = {
                 recommended: cells.includes('💼'),
                 warn: cells.includes('⚠️'),
                 fixable: cells.includes('🔧'),
                 suggestions: cells.includes('💡'),
                 deprecated: cells.includes('🚫')
             };
             
             ruleMetadata[rawRuleName] = { cwe, owasp, cvss, flags };
        }
    });

    // --- 2. GET REAL RULES FROM SOURCE ---
    const rulesDir = path.join(packagesDir, pkg, 'src/rules');
    let realRules = [];
    if (fs.existsSync(rulesDir)) {
        realRules = fs.readdirSync(rulesDir, { withFileTypes: true })
            .filter(d => {
                if (d.name.startsWith('__')) return false;
                if (d.name.startsWith('index.')) return false;
                if (d.isDirectory()) return true;
                if (d.isFile() && (d.name.endsWith('.ts') || d.name.endsWith('.js'))) return true;
                return false;
            })
            .map(d => d.name.replace(/\.(ts|js)$/, ''));
    }

    // --- 3. CUSTOM SECTIONS (Preserve) ---
    const STANDARD_HEADERS = [
        '# ', '## Description', '## Philosophy', '## Getting Started', 
        '## Rules', '## 🔗 Related ESLint Plugins', '## 📄 License', 
        '## License', '## Documentation', '## Installation', 
        '## 📦 Installation', '## 🚀 Quick Start', '## 🛡️ Security Research Coverage',
        '## References'
    ];
    
    // Explicitly ignore these headers to reduce busyness/duplication
    const IGNORED_HEADERS = [
        '## AI-Optimized Messages',
        '## 🏢 Enterprise Integration Example', 
        '## 🧭 Type-safe rule configuration', 
        '## 🔒 Privacy', 
        '## Q:', 
        '**Q:',
        '## Command Execution'
    ];

    const customSections = [];
    let currentCustomSection = null;
    let capture = false;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (line.startsWith('## ') || line.startsWith('**Q:')) {
            const isCore = STANDARD_HEADERS.some(h => trimmed.startsWith(h));
            const isIgnored = IGNORED_HEADERS.some(h => trimmed.startsWith(h));

            // Also skip core variants if they are about to be regenerated OR ignored
            if (isCore || isIgnored) {
                capture = false;
                currentCustomSection = null;
            } else {
                currentCustomSection = { header: line, content: [] };
                customSections.push(currentCustomSection);
                capture = true;
            }
        } else if (capture && currentCustomSection) {
            currentCustomSection.content.push(line);
        }
    });

    // --- 4. RECONSTRUCT CONTENT ---
    const output = [];

    // Header & Logo
    output.push('<p align="center">');
    output.push(`  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>`);
    output.push('</p>');
    output.push('');
    output.push('<p align="center">');
    // For Node Security, use specific descriptions
    if (pkg.includes('node-security')) {
         output.push('  Security-focused ESLint plugin for Node.js built-in modules (fs, child_process, vm, crypto, Buffer).');
    } else {
         output.push(`  ${shortDesc}`);
    }
    output.push('</p>');
    output.push('');
    
    // Badges
    output.push('<p align="center">');
    output.push(`  <a href="https://www.npmjs.com/package/${pkg}" target="_blank"><img src="https://img.shields.io/npm/v/${pkg}.svg" alt="NPM Version" /></a>`);
    output.push(`  <a href="https://www.npmjs.com/package/${pkg}" target="_blank"><img src="https://img.shields.io/npm/dm/${pkg}.svg" alt="NPM Downloads" /></a>`);
    output.push(`  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>`);
    output.push(`  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=${pluginName}" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=${pluginName}" alt="Codecov" /></a>`);
    output.push(`  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>`);
    output.push('</p>');
    output.push('');

    // Description
    output.push('## Description');
    output.push('');
    // We use the short description as base, assumed ample enough or user edits manual if needed.
    // For now we default to the clean standard description.
    output.push(`This plugin provides ${shortDesc}`);
    output.push(`By using this plugin, you can proactively identify and mitigate security risks across your entire codebase.`);
    output.push('');
    
    // Philosophy
    output.push(PHILOSOPHY_TEXT);
    output.push('');

    // Getting Started
    output.push('## Getting Started');
    output.push('');
    output.push(`- To check out the [guide](${docUrl}), visit [eslint.interlace.tools](${baseUrl}). 📚`);
    output.push(`- 要查看中文 [指南](${docUrl}), 请访问 [eslint.interlace.tools](${baseUrl}). 📚`);
    output.push(`- [가이드](${docUrl}) 문서는 [eslint.interlace.tools](${baseUrl})에서 확인하실 수 있습니다. 📚`);
    output.push(`- [ガイド](${docUrl})は [eslint.interlace.tools](${baseUrl})でご確認ください。 📚`);
    output.push(`- Para ver la [guía](${docUrl}), visita [eslint.interlace.tools](${baseUrl}). 📚`);
    output.push(`- للاطلاع على [الدليل](${docUrl})، قم بزيارة [eslint.interlace.tools](${baseUrl}). 📚`);
    output.push('');
    output.push('```bash');
    output.push(`npm install ${pkg} --save-dev`);
    output.push('```');
    output.push('');

    // Custom Sections (e.g. Configuration Presets)
    customSections.forEach(section => {
        const filteredContent = section.content.filter(line => !line.includes('[Rules Reference]') && !line.includes('./docs/RULES.md'));
        if (filteredContent.length === 0 && section.header.includes('Documentation')) return;
        output.push(section.header);
        output.push(filteredContent.join('\n').trim());
        output.push('');
    });

    // Rules
    if (realRules.length > 0) {
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

        const generateRow = (ruleName) => {
            const meta = ruleMetadata[ruleName] || {};
            const desc = getMdxDescription(docsSubPath, ruleName) || `Enforce ${ruleName.replace(/-/g, ' ')}`;
            const link = `[${ruleName}](${docUrl}/rules/${ruleName})`;
            
            // Fallbacks
            const cwe = meta.cwe || '';
            const owasp = meta.owasp || '';
            const cvss = meta.cvss || CVSS_MAP[ruleName] || '';
            
            const has = (key) => (meta.flags && meta.flags[key]) ? ({
                recommended: '💼', warn: '⚠️', fixable: '🔧', suggestions: '💡', deprecated: '🚫'
            })[key] : '';

            return `| ${link} | ${cwe} | ${owasp} | ${cvss} | ${desc} | ${has('recommended')} | ${has('warn')} | ${has('fixable')} | ${has('suggestions')} | ${has('deprecated')} |`;
        };

        const hasCategories = CATEGORIES[pkg];
        
        if (hasCategories) {
            // Categorized Tables
            Object.entries(hasCategories).forEach(([catName, supportedRules]) => {
                // Intersect with realRules to ensure we only show existing rules
                const rulesInCat = supportedRules.filter(r => realRules.includes(r));
                if (rulesInCat.length > 0) {
                    output.push(`### ${catName}`);
                    output.push('');
                    output.push('| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |');
                    output.push('| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |');
                    rulesInCat.forEach(r => output.push(generateRow(r)));
                    output.push('');
                }
            });
            
            // Catch-all for uncategorized
            const allCategorized = Object.values(hasCategories).flat();
            const leftover = realRules.filter(r => !allCategorized.includes(r));
            if (leftover.length > 0) {
                output.push('### Other Rules');
                output.push('');
                output.push('| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |');
                output.push('| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |');
                leftover.forEach(r => output.push(generateRow(r)));
                output.push('');
            }
        } else {
            // Single Table
            output.push('| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |');
            output.push('| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |');
            realRules.sort().forEach(r => output.push(generateRow(r)));
            output.push('');
        }
    }

    // Ecosystem
    output.push(ECOSYSTEM_TABLE);
    output.push('');

    // License
    output.push(`## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
`);
    output.push(`<p align="center">`);
    output.push(`  <a href="https://eslint.interlace.tools/docs/${docsSubPath}"><img src="https://eslint.interlace.tools/images/og-${pluginName}.png" alt="ESLint Interlace Plugin" width="100%" /></a>`);
    output.push(`</p>`);

    fs.writeFileSync(readmePath, output.join('\n'));
    console.log(`[${pkg}] Regenerated successfully.`);
});

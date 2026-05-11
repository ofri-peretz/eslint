import fs from 'node:fs';
import path from 'node:path';

const packagesDir = path.join(process.cwd(), 'packages');
const docsDir = path.join(process.cwd(), 'apps/docs/content/docs');
const tsvPath = path.join(process.cwd(), '.agent', 'type-awareness-scan.tsv');

// The 🧠 column is the type-awareness indicator (see `.agent/type-awareness-philosophy.md`).
// Glyph semantics — canonical, must agree with `scripts/sync-readme-rules.ts`:
//   🟢 = type-unaware (AST-only)
//   🟡 = type-aware (refining)  — pure-AST primary path; types refine precision
//   🟠 = type-aware (graceful)  — requires TS program; silent without it
type TypeStatus = 'unaware' | 'optional' | 'aware';

const TYPE_GLYPH: Record<TypeStatus, string> = {
    unaware: '🟢',
    optional: '🟡',
    aware: '🟠',
};

/**
 * Load the per-rule type-awareness classification from the canonical TSV at
 * `.agent/type-awareness-scan.tsv`. The TSV is the single source of truth
 * (see `.agent/type-awareness-audit.md`). Returns an empty map when the
 * file is absent so the script stays runnable.
 */
function loadTypeAwarenessMap(): Map<string, TypeStatus> {
    const map = new Map<string, TypeStatus>();
    if (!fs.existsSync(tsvPath)) return map;
    const lines = fs.readFileSync(tsvPath, 'utf-8').split('\n');
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        const [pluginShort, rule, status] = line.split('\t');
        if (!pluginShort || !rule || !status) continue;
        const normalized = status.trim();
        if (normalized !== 'unaware' && normalized !== 'optional' && normalized !== 'aware') continue;
        map.set(`${pluginShort}/${rule}`, normalized);
    }
    return map;
}

const TYPE_AWARENESS_MAP = loadTypeAwarenessMap();

// Packages whose READMEs are hand-maintained (e.g. carry a deprecation banner).
// The generator skips these entirely so it never rewrites or "fixes" them.
const DEPRECATED_PACKAGES = new Set<string>([
    'eslint-plugin-crypto', // Consolidated into eslint-plugin-node-security (2026-05-10)
]);

// Get all directories in packages/
const packages = fs.readdirSync(packagesDir, { withFileTypes: true })
    .filter((dirent: fs.Dirent) => dirent.isDirectory())
    .map((dirent: fs.Dirent) => dirent.name)
    .filter((name: string) => name.startsWith('eslint-plugin-'))
    .filter((name: string) => !DEPRECATED_PACKAGES.has(name));

// Map of short specific descriptions for the Plugin itself
const DESCRIPTIONS: Record<string, string> = {
    'eslint-plugin-express-security': 'Comprehensive security rules for Express.js applications, mapping to OWASP Top 10.',
    // Kept for description-lock validation even though crypto is in
    // DEPRECATED_PACKAGES (the generator skips it; the description still
    // pins what the package historically claims to do).
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
    'eslint-plugin-react-a11y': 'Accessibility (a11y) rules for React applications, enforcing WCAG standards.',
    'eslint-plugin-node-security': 'Security rules for Node.js core modules (fs, child_process, crypto, etc).',
    'eslint-plugin-reliability': 'Reliability rules for defensive programming, error handling, and async correctness.',
    'eslint-plugin-conventions': 'Project conventions: naming, file structure, and code style consistency.',
    'eslint-plugin-maintainability': 'Maintainability rules — complexity ceilings, dead code, and readability guardrails.',
    'eslint-plugin-modernization': 'Modernization rules — prefer modern ES idioms over legacy patterns.',
    'eslint-plugin-modularity': 'Modularity rules — module boundaries, circular dependency detection, and layered architecture.',
    'eslint-plugin-operability': 'Operability rules — observability hooks, structured logging, and runtime resilience.'
};

// CVSS fallback map
const CVSS_MAP: Record<string, string> = {
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
| [\`eslint-plugin-node-security\`](https://www.npmjs.com/package/eslint-plugin-node-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-node-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-node-security) | Node.js core-module security (fs, child_process, vm, crypto, Buffer). |
| [\`eslint-plugin-jwt\`](https://www.npmjs.com/package/eslint-plugin-jwt) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | JWT security & best practices. |
| [\`eslint-plugin-browser-security\`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | Browser-specific security & XSS prevention. |
| [\`eslint-plugin-express-security\`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express.js security hardening rules. |
| [\`eslint-plugin-lambda-security\`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda security best practices. |
| [\`eslint-plugin-nestjs-security\`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS security rules & patterns. |
| [\`eslint-plugin-mongodb-security\`](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | MongoDB security best practices. |
| [\`eslint-plugin-vercel-ai-security\`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security hardening. |
| [\`eslint-plugin-import-next\`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Next-gen import sorting & architecture. |`;

// Categories for specific plugins
const CATEGORIES: Record<string, Record<string, string[]>> = {
   // 'eslint-plugin-secure-coding': { ... } DISABLED to enforce single table
};

/**
 * Find the documentation path for a plugin
 */
function findDocsPath(pluginName: string): string {
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
function getMdxDescription(docsSubPath: string, ruleName: string): string {
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

// Guard the top-level loop so importing this module for testing or for its
// exported helpers does not silently rewrite all 20 plugin READMEs. The
// previous version ran on every `import` — discovered the hard way when a
// type-probe import overwrote every README, reverting the canonical
// generator's rule table to the obsolete phantom-rules form.
function main(): void {
    packages.forEach(processPackage);
}

function processPackage(pkg: string): void {
    const readmePath = path.join(packagesDir, pkg, 'README.md');
    if (!fs.existsSync(readmePath)) return;

    console.log(`Processing ${pkg}...`);
    let content = fs.readFileSync(readmePath, 'utf8');
    const lines = content.split('\n');
    const pluginName = pkg.replace('eslint-plugin-', '');
    const shortDesc = DESCRIPTIONS[pkg];
    if (!shortDesc) {
        console.error(
            `No DESCRIPTIONS entry for ${pkg} — add one to tools/scripts/fix-readmes.ts. ` +
            `Refusing to silently substitute the security-plugin fallback into a non-security README.`
        );
        process.exit(1);
    }

    // Resolve Docs URL
    const docsSubPath = findDocsPath(pkg);
    const docUrl = `https://eslint.interlace.tools/docs/${docsSubPath}`;
    const baseUrl = `https://eslint.interlace.tools`;

    // --- 1. HARVEST METADATA from existing README ---
    // We scrape existing tables to preserve manual CWE/OWASP/CVSS tags. The
    // type-awareness column (🧠 header) carries one of 🟢/🟡/🟠 per row —
    // earlier versions of this script mistakenly checked for a 🧠 in cells
    // (it's the header glyph, never a cell value) and then mislabeled the
    // column as "AI-Analyzed" in the legend, which contradicted the canonical
    // generator at `scripts/sync-readme-rules.ts`.
    type RuleMeta = {
        cwe: string;
        owasp: string;
        cvss: string;
        typeStatus: TypeStatus | null;
        flags: {
            recommended: boolean;
            warn: boolean;
            fixable: boolean;
            suggestions: boolean;
            deprecated: boolean;
        };
    };
    const ruleMetadata: Record<string, RuleMeta> = {};
    const ruleRowRegex = /^\|\s*\[?([a-zA-Z0-9\-\/]+)\]?.*\|.*$/;

    lines.forEach((line: string) => {
        const match = line.match(ruleRowRegex);
        if (match && !line.includes('---')) {
             const rawRuleName = match[1].replace(/\[|\]/g, ''); // Clean logic
             // Extract Cells
             const cells = line.split('|').map((c: string) => c.trim());
             if (cells.length < 3) return;

             // Extract Metadata
             let cwe = cells.find((c: string) => c.includes('CWE-')) || '';
             let owasp = cells.find((c: string) => c.includes(':202')) || '';
             if (owasp) owasp = owasp.replace('2021', '2025');
             let cvss = cells.find((c: string) => /^[0-9]\.[0-9]$/.test(c)) || '';

             // Type-awareness from the harvested row (the 🧠 column body cell).
             // `null` means the harvest could not determine — the renderer
             // below falls back to the canonical TSV.
             const typeStatus: TypeStatus | null = cells.some((c: string) => c.includes('🟢'))
                 ? 'unaware'
                 : cells.some((c: string) => c.includes('🟡'))
                     ? 'optional'
                     : cells.some((c: string) => c.includes('🟠'))
                         ? 'aware'
                         : null;

             const flags = {
                 recommended: cells.includes('💼'),
                 warn: cells.includes('⚠️'),
                 fixable: cells.includes('🔧'),
                 suggestions: cells.includes('💡'),
                 deprecated: cells.includes('🚫')
             };

             ruleMetadata[rawRuleName] = { cwe, owasp, cvss, typeStatus, flags };
        }
    });

    // --- 2. GET REAL RULES FROM SOURCE ---
    const rulesDir = path.join(packagesDir, pkg, 'src/rules');
    let realRules: string[] = [];
    if (fs.existsSync(rulesDir)) {
        realRules = fs.readdirSync(rulesDir, { withFileTypes: true })
            .filter((d: fs.Dirent) => {
                if (d.name.startsWith('__')) return false;
                if (d.name.startsWith('index.')) return false;
                if (d.isDirectory()) return true;
                if (d.isFile() && (d.name.endsWith('.ts') || d.name.endsWith('.js'))) return true;
                return false;
            })
            .map((d: fs.Dirent) => d.name.replace(/\.(ts|js)$/, ''));
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

    const customSections: { header: string; content: string[] }[] = [];
    let currentCustomSection: { header: string; content: string[] } | null = null;
    let capture = false;

    lines.forEach((line: string) => {
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
    const output: string[] = [];

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

    // Description — use the canonical DESCRIPTIONS entry verbatim. The
    // previous template appended a "proactively identify and mitigate
    // security risks" sentence to every plugin, which was wrong for the
    // quality plugins (reliability, conventions, etc.). The shortDesc
    // already conveys what the plugin does — no boilerplate epilogue.
    output.push('## Description');
    output.push('');
    output.push(`This plugin provides ${shortDesc}`);
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
        const filteredContent = section.content.filter((line: string) => !line.includes('[Rules Reference]') && !line.includes('./docs/RULES.md'));
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
        output.push('| ⚠️ | **Warns**: Set to warn in recommended preset. |');
        output.push('| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |');
        output.push('| 💡 | **Suggestions**: Providing code suggestions in IDE. |');
        output.push('| 🚫 | **Deprecated**: This rule is deprecated. |');
        output.push('| 🟢 | **Type-unaware**: AST-only, runs in oxlint JS-plugin tier. |');
        output.push('| 🟡 | **Type-aware (refining)**: pure-AST primary path; types refine precision. |');
        output.push('| 🟠 | **Type-aware (graceful)**: requires TS program; silent without it. |');
        output.push('');

        const generateRow = (ruleName: string) => {
            const meta = ruleMetadata[ruleName] as RuleMeta | undefined;
            const desc = getMdxDescription(docsSubPath, ruleName) || `Enforce ${ruleName.replace(/-/g, ' ')}`;
            const link = `[${ruleName}](${docUrl}/rules/${ruleName})`;

            // Fallbacks
            const cwe = meta?.cwe || '';
            const owasp = meta?.owasp || '';
            const cvss = meta?.cvss || CVSS_MAP[ruleName] || '';

            // Type-awareness glyph (🧠 column body). Prefer the canonical TSV
            // so a regenerated README never loses a classification the legacy
            // version of this script would have dropped. Fall back to the
            // harvested glyph, then default to 🟢 (type-unaware).
            const pluginShort = pkg.replace(/^eslint-plugin-/, '');
            const typeStatus: TypeStatus =
                TYPE_AWARENESS_MAP.get(`${pluginShort}/${ruleName}`)
                ?? meta?.typeStatus
                ?? 'unaware';
            const typeCell = TYPE_GLYPH[typeStatus];

            const has = (key: keyof RuleMeta['flags']) => (meta?.flags && meta.flags[key]) ? ({
                recommended: '💼', warn: '⚠️', fixable: '🔧', suggestions: '💡', deprecated: '🚫'
            })[key] : '';

            return `| ${link} | ${cwe} | ${owasp} | ${cvss} | ${desc} | ${typeCell} | ${has('recommended')} | ${has('warn')} | ${has('fixable')} | ${has('suggestions')} | ${has('deprecated')} |`;
        };

        const hasCategories = CATEGORIES[pkg];
        
        if (hasCategories) {
            // Categorized Tables
            Object.entries(hasCategories).forEach(([catName, supportedRules]) => {
                // Intersect with realRules to ensure we only show existing rules
                const rulesInCat = supportedRules.filter((r: string) => realRules.includes(r));
                if (rulesInCat.length > 0) {
                    output.push(`### ${catName}`);
                    output.push('');
                    output.push('| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |');
                    output.push('| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |');
                    rulesInCat.forEach((r: string) => output.push(generateRow(r)));
                    output.push('');
                }
            });
            
            // Catch-all for uncategorized
            const allCategorized = Object.values(hasCategories).flat();
            const leftover = realRules.filter((r: string) => !allCategorized.includes(r));
            if (leftover.length > 0) {
                output.push('### Other Rules');
                output.push('');
                output.push('| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |');
                output.push('| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |');
                leftover.forEach((r: string) => output.push(generateRow(r)));
                output.push('');
            }
        } else {
            // Single Table
            output.push('| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |');
            output.push('| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |');
            realRules.sort().forEach((r: string) => output.push(generateRow(r)));
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
}

// Only run when invoked directly (e.g. `tsx tools/scripts/fix-readmes.ts`).
// Importing this module for tests or for the helpers above must not regenerate
// any READMEs as a side effect — the repo is CJS so `require.main` is the
// idiomatic entry-point check (matches `scripts/sync-readme-rules.ts`).
if (require.main === module) {
    main();
}

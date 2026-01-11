const fs = require('fs');
const path = require('path');

const packagesDir = path.join(process.cwd(), 'packages');

// Get all directories in packages/
const packages = fs.readdirSync(packagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => name.startsWith('eslint-plugin-'));

// Map of short descriptions for 1-liner intro
const DESCRIPTIONS = {
    'express-security': 'Comprehensive security rules for Express.js applications, mapping to OWASP Top 10.',
    'crypto': 'Cryptographic security rules enforcing best practices and modern standards.',
    'react-features': 'Advanced React patterns and best practices enforcement.',
    'nestjs-security': 'Security rules tailored for NestJS applications.',
    'jwt': 'Security validation for JSON Web Tokens (JWT) implementation.',
    'pg': 'Security rules for PostgreSQL interaction in Node.js.',
    'browser-security': 'Browser-specific security rules to prevent XSS and other client-side attacks.',
    'lambda-security': 'Security best practices for AWS Lambda functions.',
    'secure-coding': 'General secure coding practices and OWASP compliance.',
    'vercel-ai-security': 'Security rules for Vercel AI SDK usage.',
    'import-next': 'Next-generation import sorting and validation rules.',
    'mongodb-security': 'Security rules for MongoDB queries and interactions.',
    'quality': 'Code quality and maintainability standards.',
    'react-a11y': 'Accessibility rules for React applications.'
};

const CVSS_MAP = {
    // CVEs
    'no-insecure-rsa-padding': '7.4',
    'no-cryptojs-weak-random': '5.3',
    'require-secure-pbkdf2-digest': '9.1',

    // Generic
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

Interlace isn't just a set of rules; it's a philosophy of "interlacing" security directly into your development workflow. We believe in tools that guide rather than gatekeep, providing actionable, educational feedback that elevates developer expertise while securing code.`;

packages.forEach(pkg => {
    const readmePath = path.join(packagesDir, pkg, 'README.md');
    if (!fs.existsSync(readmePath)) return;

    let content = fs.readFileSync(readmePath, 'utf8');
    
    // Split lines for processing
    const lines = content.split('\n');

    const pluginName = pkg.replace('eslint-plugin-', '');
    const docLinkLine = `> **📘 Full Documentation:** [https://eslint.interlace.tools/docs/${pluginName}](https://eslint.interlace.tools/docs/${pluginName})`;

    // extract standard blocks
    let titleIndex = -1;
    let imgStart = -1;
    let imgEnd = -1;
    let badgeStart = -1;
    let badgeEnd = -1;
    let descStart = -1;
    let descEnd = -1;

    // A. Find Title
    if (lines[0].startsWith('# ')) titleIndex = 0;

    // B. Find Image
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('<div align="center">')) {
            imgStart = i;
            for (let j = i; j < lines.length; j++) {
                if (lines[j].includes('</div>')) {
                    imgEnd = j;
                    break;
                }
            }
            break; 
        }
    }

    // C. Find Badges
    for (let i = 0; i < lines.length; i++) {
        if (i === titleIndex) continue;
        if (i >= imgStart && i <= imgEnd) continue;
        if (lines[i].trim().startsWith('[![')) {
             badgeStart = i;
             for (let j = i; j < lines.length; j++) {
                 if (!lines[j].trim().startsWith('[![') && lines[j].trim() !== '') {
                     badgeEnd = j - 1;
                     break;
                 }
                 badgeEnd = j;
             }
             break;
        }
    }

    // D. Find Description (Blockquote)
    // IMPORTANT: In previous passes, we updated desc to include Title > Doc Link > ...
    for (let i = 0; i < lines.length; i++) {
        if (i === titleIndex) continue;
        if (i >= imgStart && i <= imgEnd) continue;
        if (lines[i].trim().startsWith('>') && descStart === -1) {
             descStart = i;
             for (let j = i; j < lines.length; j++) {
                if (!lines[j].trim().startsWith('>') && lines[j].trim() !== '') {
                    descEnd = j - 1;
                    break;
                }
                descEnd = j;
             }
             break; // Only capture the first blockquote as description
        }
    }

    // Extract Contents
    let titleBlock = titleIndex !== -1 ? lines[titleIndex] : '';
    let imgBlock = (imgStart !== -1 && imgEnd !== -1) ? lines.slice(imgStart, imgEnd + 1) : [];
    let badgeBlock = (badgeStart !== -1 && badgeEnd !== -1) ? lines.slice(badgeStart, badgeEnd + 1) : [];
    let descBlock = (descStart !== -1 && descEnd !== -1) ? lines.slice(descStart, descEnd + 1) : [];

    // --- RESTRUCTURE START ---

    // 1. Resize Image (200px)
    if (imgBlock.length > 0) {
        imgBlock = imgBlock.map(line => {
             return line.replace(/width="100%"/g, 'width="200"')
                        .replace(/width="300"/g, 'width="200"')
                        .replace(/width="600"/g, 'width="200"');
        });
    }

    // 2. Prepare 1-liner Intro
    // Use mapped description or fallback
    const shortDesc = DESCRIPTIONS[pluginName] || 'Security-focused ESLint plugin.';
    const shortDescBlock = ['', shortDesc, '']; 

    // 3. Prepare Description Section
    // Ensure the blockquote with doc link and pro tip is preserved but maybe moved?
    // User wants: Intro -> Badges -> Description
    // We already have descBlock which contains Doc Link + Pro Tip + Original Description
    // Let's create an explicit '## Description' section containing this.

    // 4. Badges (Ensure Exists)
    if (badgeBlock.length === 0) {
         const shortName = pluginName;
         badgeBlock = [
            `[![npm version](https://img.shields.io/npm/v/${pkg}.svg)](https://www.npmjs.com/package/${pkg})`,
            `[![npm downloads](https://img.shields.io/npm/dm/${pkg}.svg)](https://www.npmjs.com/package/${pkg})`,
            `[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)`,
            `[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=${shortName})](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=${shortName})`,
            `[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)`
        ];
    }

    // 5. Consolidate Rules Table
    // Iterate lines to find all tables starting with | Rule | or similar
    // Also capture headings above them to use as Tags.
    
    // We need to do this carefully. We cannot just regex.
    // Let's first identify indices for removal of header parts.
    const indicesToRemove = new Set();
    if (titleIndex !== -1) indicesToRemove.add(titleIndex);
    if (imgStart !== -1) for(let k=imgStart; k<=imgEnd; k++) indicesToRemove.add(k);
    if (descStart !== -1) for(let k=descStart; k<=descEnd; k++) indicesToRemove.add(k);
    if (badgeStart !== -1) for(let k=badgeStart; k<=badgeEnd; k++) indicesToRemove.add(k);

    // Filter lines to get "body"
    let bodyLines = lines.filter((_, idx) => !indicesToRemove.has(idx)).join('\n');
    let bodyLineArray = bodyLines.split('\n');

    // Remove "## Philosophy" if it exists (we will re-add standard one)
    let philStart = -1;
    let philEnd = -1;
     for(let i=0; i<bodyLineArray.length; i++) {
        if(bodyLineArray[i].includes('## Philosophy')) {
            philStart = i;
            // find next section
             for(let j=i+1; j<bodyLineArray.length; j++) {
                 if(bodyLineArray[j].startsWith('## ')) {
                     philEnd = j;
                     break;
                 }
             }
             if (philEnd === -1) philEnd = bodyLineArray.length;
             break;
        }
    }
    if (philStart !== -1) {
        bodyLineArray.splice(philStart, philEnd - philStart);
    }
    
    // Process Tables for Consolidation
    // Strategy: Parse Markdown to find headings and tables
    // We look for '### <Title>' followed eventually by a table.
    // We collect all rows.
    
    let allRows = [];
    let currentTag = 'General';
    let newBodyArray = [];
    let skippingTable = false;
    let insideRulesSection = false;

    for (let i = 0; i < bodyLineArray.length; i++) {
        const line = bodyLineArray[i];

        // Detect Rules Section Start
        if (line.match(/^##\s+.*Rules/)) {
            insideRulesSection = true;
            newBodyArray.push('## Rules'); // We will just put the table here later
            newBodyArray.push('');
            // We want to skip everything inside here until next Double Header (##)
            continue;
        }

        if (insideRulesSection) {
            if (line.startsWith('## ') && !line.match(/^##\s+.*Rules/)) {
                // Next major section
                insideRulesSection = false;
                newBodyArray.push(line);
                continue;
            }

            // Capture Tag from H3
            if (line.startsWith('### ')) {
                // "### Headers & CORS (4 rules)" -> "Headers & CORS"
                currentTag = line.replace('### ', '').replace(/\(.*\)/, '').trim();
                continue;
            }

            // Capture Table Row
            if (line.trim().startsWith('|')) {
                // Ignore headers/separators
                if (line.includes('---') || line.toLowerCase().includes('| rule |')) continue;
                
                // Parse row
                // Assume standard pipe format: | Rule | ...
                const parts = line.split('|').filter(p => p.trim() !== ''); // split and filter empty edges
                // Reconstruct with Tag
                // Original: Rule | CWE | OWASP | CVSS | Desc | ...
                // New: Rule | Tag | CWE | OWASP | CVSS | Desc | ...
                
                // Be careful about splitting logic if pipes are inside content? Unlikely for this readme.
                // Standard row: | [rule-name](...) | CWE-123 | ...
                
                // Let's construct a row object or just string manipulation
                // parts[0] is Rule
                // We want to insert Tag after Rule (idx 1)
                
                // Need to ensure we don't duplicate rows if multiple runs
                // ...
                
                // Rebuild row string
                const rule = parts[0]?.trim() || '';
                if (!rule) continue;
                
                // Check if CVSS needs injecting (from previous logic)
                let cvssIndex = 3; // Rule(0), CWE(1), OWASP(2), CVSS(3)? Need to verify header structure
                // Assume current structure: | Rule | CWE | OWASP | CVSS | Desc | ...
                // Let's verify via parts length
                
                // Just prepend Tag to parts and join
                // But wait, split/filter removes empty start/end.
                // Reconstruct: | Rule | Tag | Rest... |
                
                let rowContent = `| ${parts.join(' | ')} |`; // Placeholder
                
                // let's interpret columns based on common known structure
                // Rule, CWE, OWASP, CVSS, Description, ...
                
                // Inject Tag
                // Rule | Tag | CWE | ...
                
                // To be safe, let's just insert the tag value into index 1
                parts.splice(1, 0, currentTag);
                
                allRows.push(`| ${parts.join(' | ')} |`);
                
            }
            // Skip other content in rules section (descriptions between tables etc, unless we want to keep them? 
            // User wants consolidated table, implies removing intermediate text)
            continue; 
        }

        newBodyArray.push(line);
    }
    
    // Sort rows? or leave as is (grouped by encounter)
    // If we have rows, build the table
    if (allRows.length > 0) {
        // Find where we put "## Rules"
        const rulesIdx = newBodyArray.indexOf('## Rules');
        if (rulesIdx !== -1) {
            const header = `| Rule | Tag | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |`;
            const separator = `| :--- | :--- | :---: | :---: | :---: | :--- | :-: | :-: | :-: | :-: | :-: |`;
            // Insert table
            newBodyArray.splice(rulesIdx + 1, 0, header, separator, ...allRows);
        }
    }

    // Reconstruct Final Layout
    // Title
    // Image
    // Intro (1-liner)
    // Badges
    // ## Description
    // [Blockquote descBlock]
    // ## Philosophy
    // ## Getting Started
    // [Rest of Body (Rules, etc)]

    const newContent = [
        titleBlock,
        '',
        ...imgBlock,
        '',
        ...shortDescBlock,
        ...badgeBlock,
        '',
        '## Description',
        '',
        ...descBlock,
        '',
        PHILOSOPHY_TEXT,
        '',
        '## Getting Started',
        '',
        `\`\`\`bash
npm install ${pkg} --save-dev
\`\`\``,
        '',
        ...newBodyArray
    ].join('\n');
    
    // Clean up
    const finalContent = newContent.replace(/\n{3,}/g, '\n\n');
    
    fs.writeFileSync(readmePath, finalContent);
    console.log(`[${pkg}] Applied NestJS-style layout & Unified Rules Table`);

});

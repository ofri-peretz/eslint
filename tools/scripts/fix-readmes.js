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
    'secure-coding': 'ESLint plugin for general secure coding practices and OWASP compliance.',
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
 
**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.`;

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
    // 1. Resize Image (200px) & Extract Info
    let imageUrl = '';
    let imageAlt = 'ESLint Interlace Plugin';

    // Helper to check if URL is the generic logo
    const isGenericLogo = (url) => url.includes('eslint-interlace-logo.svg');

    // A. Check Top Image Block
    if (imgBlock.length > 0) {
        const imgLine = imgBlock.find(l => l.includes('<img'));
        if (imgLine) {
            const srcMatch = imgLine.match(/src="([^"]+)"/);
            if (srcMatch && !isGenericLogo(srcMatch[1])) {
                 imageUrl = srcMatch[1];
            }
            
            const altMatch = imgLine.match(/alt="([^"]+)"/);
            if (altMatch) imageAlt = altMatch[1];
        }
    }

    // B. Check Footer (Scanning existing lines) if we didn't find specific image at top
    if (!imageUrl) {
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            if (line.includes('<img') && line.includes('width="100%"')) {
                const srcMatch = line.match(/src="([^"]+)"/);
                if (srcMatch && !isGenericLogo(srcMatch[1])) {
                    imageUrl = srcMatch[1];
                    // Also try to grab alt? Unlikely to be different/needed if we have the URL
                    break;
                }
            }
        }
    }

    // REPLACE Top Image with Generic Logo (NestJS Style: width 120, centered, linked)
    // Mimics NestJS pattern: <p align="center"><a href="..." ...><img ... /></a></p>
    if (imageUrl || imgBlock.length > 0) {
        imgBlock = [
            '<p align="center">',
            '  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>',
            '</p>'
        ];
    }

    // 2. Prepare 1-liner Intro
    // Use mapped description or fallback
    const shortDesc = DESCRIPTIONS[pluginName] || 'Security-focused ESLint plugin.';
    const shortDescBlock = [
        '<p align="center">',
        `  ${shortDesc}`,
        '</p>'
    ]; 

    // 3. Prepare Description Section
    // Ensure the blockquote with doc link and pro tip is preserved but maybe moved?
    // User wants: Intro -> Badges -> Description
    // We already have descBlock which contains Doc Link + Pro Tip + Original Description
    // Let's create an explicit '## Description' section containing this.

    // 4. Badges (Ensure Exists)
    if (badgeBlock.length === 0) {
         const shortName = pluginName;
         badgeBlock = [
            '',
            '<p align="center">',
            `  <a href="https://www.npmjs.com/package/${pkg}"><img src="https://img.shields.io/npm/v/${pkg}.svg" alt="npm version" /></a>`,
            `  <a href="https://www.npmjs.com/package/${pkg}"><img src="https://img.shields.io/npm/dm/${pkg}.svg" alt="npm downloads" /></a>`,
            `  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>`,
            `  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=${shortName}"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=${shortName}" alt="codecov" /></a>`,
            `  <a href="https://github.com/ofri-peretz/eslint"><img src="https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white" alt="Dec 2025" /></a>`,
            '</p>'
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
    // We already identified indicesToRemove which includes the original Top Image block.
    // Now we must also ensure we strip any *existing* footer image so we don't duplicate it.
    let bodyLines = lines.filter((_, idx) => !indicesToRemove.has(idx)).join('\n');
    let bodyLineArray = bodyLines.split('\n');

    // Remove existing Footer Image if present
    // Logic: Remove lines that look like a full-width image (anchor or img)
    bodyLineArray = bodyLineArray.filter(line => {
        const isFooterImg = line.includes('<img') && line.includes('width="100%"');
        // Check if it's an anchor wrapper around it? 
        // Simple filter: if line has width="100%" and img src, drop it.
        // Also drop lines that are just closing </a> if they were wrapping it? 
        // This is tricky with simple line split. 
        // For now, let's assume the footer image is the main thing to strip.
        if (isFooterImg) return false;
        
        // Strip standalone formatting/links potentially related to footer?
        // Let's rely on the fact that our new footer is distinct.
        // If the user manually added something else 100%, it might get nuked.
        return true;
    });

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
        ...newBodyArray,
        '',
        imageUrl ? `<a href="https://eslint.interlace.tools/docs/${pluginName}"><img src="${imageUrl}" alt="${imageAlt}" width="100%" /></a>` : ''
    ].join('\n');
    
    // Clean up
    const finalContent = newContent.replace(/\n{3,}/g, '\n\n');
    
    fs.writeFileSync(readmePath, finalContent);
    console.log(`[${pkg}] Applied NestJS-style layout & Unified Rules Table`);

});

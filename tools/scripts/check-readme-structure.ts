import fs from 'fs';
import path from 'path';

const packagesDir = path.join(process.cwd(), 'packages');

const packages = fs.readdirSync(packagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => name.startsWith('eslint-plugin-'));

let hasError = false;

console.log('🔍 Verifying README structure for all plugins...');

packages.forEach(pkg => {
    const readmePath = path.join(packagesDir, pkg, 'README.md');
    if (!fs.existsSync(readmePath)) {
        console.error(`❌ [${pkg}] README.md missing`);
        hasError = true;
        return;
    }

    const content = fs.readFileSync(readmePath, 'utf8');
    
    // Check Required Sections
    const requiredheaders = [
        '## Description',
        '## Philosophy',
        '## Getting Started',
        '## Rules',
        '## 📄 License'
    ];

    const missingHeaders = requiredheaders.filter(h => !content.includes(h));
    
    // Check specific elements
    // Interlace Logo
    const hasLogo = content.includes('eslint-interlace-logo-light.svg');
    // Badges (NPM, License)
    const hasBadges = content.includes('img.shields.io/npm/v/') && content.includes('img.shields.io/badge/License-MIT');
    
    // Check Rule Table (if Rules section exists)
    // We expect at least one table with "Rule" column
    const hasRuleTable = content.includes('| Rule |') || content.includes('| Rule');

    if (missingHeaders.length > 0 || !hasLogo || !hasBadges || !hasRuleTable) {
        console.error(`❌ [${pkg}] Structure violation:`);
        if (missingHeaders.length > 0) console.error(`   - Missing headers: ${missingHeaders.join(', ')}`);
        if (!hasLogo) console.error(`   - Missing Interlace Logo`);
        if (!hasBadges) console.error(`   - Missing Standard Badges`);
        if (!hasRuleTable) console.error(`   - Missing Rules Table`);
        hasError = true;
    } else {
        // Strict check: Philosophy should strictly be the Interlace standard text
        if (!content.includes('Interlace** fosters **strength through integration')) {
             console.error(`❌ [${pkg}] Philosophy text does not match standard`);
             hasError = true;
        } else {
             // console.log(`✅ [${pkg}] OK`);
        }
    }
});

if (hasError) {
    console.error('\n💥 README structure verification failed.');
    process.exit(1);
} else {
    console.log('\n✅ All READMEs follow the Interlace Solid Structure.');
}

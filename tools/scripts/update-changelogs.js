const fs = require('fs');
const path = require('path');

const packagesDir = path.join(process.cwd(), 'packages');
const packages = fs.readdirSync(packagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => name.startsWith('eslint-plugin-'));

const message = '- Updated README.md with consolidated rule tables and correct documentation links.';

packages.forEach(pkg => {
    const changelogPath = path.join(packagesDir, pkg, 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
        let content = fs.readFileSync(changelogPath, 'utf8');
        
        // Check if Unreleased section exists
        if (content.includes('## [Unreleased]')) {
            // Check if message already exists to avoid dupes
            if (!content.includes(message)) {
                content = content.replace('## [Unreleased]', `## [Unreleased]\n\n${message}`);
                fs.writeFileSync(changelogPath, content);
                console.log(`[${pkg}] Updated existing Unreleased section.`);
            } else {
                console.log(`[${pkg}] Message already in Unreleased.`);
            }
        } else {
            // Insert Unreleased section after header
            // Assuming header ends with "Semantic Versioning]." or similar, or just find the first "## ["
            const firstVersionIndex = content.indexOf('## [');
            if (firstVersionIndex !== -1) {
                const newContent = content.slice(0, firstVersionIndex) + 
                                   `## [Unreleased]\n\n${message}\n\n` + 
                                   content.slice(firstVersionIndex);
                fs.writeFileSync(changelogPath, newContent);
                console.log(`[${pkg}] Created Unreleased section.`);
            } else {
                // Formatting fallback
                console.log(`[${pkg}] Could not find insertion point (no existing versions?), appending.`);
                fs.appendFileSync(changelogPath, `\n## [Unreleased]\n\n${message}\n`);
            }
        }
    } else {
        console.log(`[${pkg}] No CHANGELOG.md found.`);
    }
});

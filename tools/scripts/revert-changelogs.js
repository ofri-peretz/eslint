const fs = require('fs');
const path = require('path');

const packagesDir = path.join(process.cwd(), 'packages');
const packages = fs.readdirSync(packagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => name.startsWith('eslint-plugin-'));

packages.forEach(pkg => {
    const changelogPath = path.join(packagesDir, pkg, 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
        let content = fs.readFileSync(changelogPath, 'utf8');
        
        // Remove the Unreleased section and the specific message we added
        // We added: ## [Unreleased]\n\n- Updated README.md with consolidated rule tables and correct documentation links.\n\n
        
        // simple regex to remove the specific block we likely added
        const regex = /## \[Unreleased\]\s+-\s+Updated README\.md with consolidated rule tables and correct documentation links\.\s+/g;
        
        if (regex.test(content)) {
            content = content.replace(regex, '');
            // Clean up potentially left over excessive newlines
            content = content.replace(/\n{3,}/g, '\n\n');
            fs.writeFileSync(changelogPath, content);
            console.log(`[${pkg}] Reverted Unreleased section.`);
        } else {
             console.log(`[${pkg}] "Unreleased" block not found matching exact pattern.`);
             // Fallback: try removing just the header if the message was somehow different or manual edit failure
             if (content.includes('## [Unreleased]')) {
                 // Try to be careful not to delete legitimate unreleased stuff if it existed before (though unlikely based on previous context)
                 // But for now, let's just assume we want to strip the unreleased header we probably added if it's empty or contains our message
                 // actually, the user questioned it, so removing it to be safe for lint is better.
                 
                 // If the linter explicitly bans "## [Unreleased]", we should remove it.
                 // regex for ## [Unreleased] followed by our message
                 const roughRegex = /## \[Unreleased\][\s\S]*?(?=\n## |$)/;
                 // ONLY remove if it contains our specific message to be safe
                 if (content.match(roughRegex) && content.match(roughRegex)[0].includes('Updated README.md')) {
                     content = content.replace(roughRegex, '');
                     content = content.replace(/\n{3,}/g, '\n\n');
                     fs.writeFileSync(changelogPath, content);
                     console.log(`[${pkg}] Reverted "Unreleased" section (rough match).`);
                 }
             }
        }
    }
});

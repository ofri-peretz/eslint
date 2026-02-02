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
        
        // If file already starts with # Changelog, it's likely fine (or at least cleaner)
        if (content.trim().startsWith('# Changelog')) {
            console.log(`[${pkg}] Already starts with # Changelog. Skipping.`);
            return;
        }

        const changelogIndex = content.indexOf('# Changelog');
        if (changelogIndex === -1) {
            console.log(`[${pkg}] No '# Changelog' header found. skipping.`);
            return;
        }

        console.log(`[${pkg}] Fixing header order...`);

        const topContent = content.substring(0, changelogIndex).trim();
        const bottomContent = content.substring(changelogIndex); // Starts with # Changelog

        // Find insertion point in bottomContent
        // We want to insert after ## [Unreleased] section, or after preamble if no Unreleased
        
        let insertionIndex = -1;
        
        const unreleasedMatch = bottomContent.match(/## \[Unreleased\]/);
        if (unreleasedMatch) {
            // Find the NEXT header after Unreleased
            const unreleasedIndex = unreleasedMatch.index;
            const contentAfterUnreleased = bottomContent.substring(unreleasedIndex + unreleasedMatch[0].length);
            
            // Search for next ## [Version] or ## Version or # Version
            const nextHeaderMatch = contentAfterUnreleased.match(/\n#+ \[?\d/);
            
            if (nextHeaderMatch) {
                insertionIndex = unreleasedIndex + unreleasedMatch[0].length + nextHeaderMatch.index;
            } else {
                // No existing versions? Append at end
                insertionIndex = bottomContent.length;
            }
        } else {
            // No Unreleased section? Insert after preamble
            // Preamble ends at first header
            const firstHeaderMatch = bottomContent.match(/\n#+ \[?\d/);
            if (firstHeaderMatch) {
                insertionIndex = firstHeaderMatch.index;
            } else {
                 insertionIndex = bottomContent.length;
            }
        }

        const newContent = bottomContent.substring(0, insertionIndex) + 
                           '\n\n' + topContent + '\n\n' + 
                           bottomContent.substring(insertionIndex);

        // Cleanup multiple newlines
        const cleanContent = newContent.replace(/\n{3,}/g, '\n\n');
        
        fs.writeFileSync(changelogPath, cleanContent);
        console.log(`[${pkg}] Fixed.`);
    }
});

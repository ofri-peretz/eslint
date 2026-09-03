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
        
        // Fix: ## Version (YYYY-MM-DD) -> ## [Version] - YYYY-MM-DD
        // Regex to capture: ## <version> (<date>)
        content = content.replace(/^## (\d+\.\d+\.\d+) \(([\d-]+)\)/gm, '## [$1] - $2');
        
        // Fix: ## [Version] (YYYY-MM-DD) -> ## [Version] - YYYY-MM-DD
        content = content.replace(/^## \[(\d+\.\d+\.\d+)\] \(([\d-]+)\)/gm, '## [$1] - $2');

         // Fix: # Version (YYYY-MM-DD) -> ## [Version] - YYYY-MM-DD (fixing level and format)
        content = content.replace(/^# (\d+\.\d+\.\d+) \(([\d-]+)\)/gm, '## [$1] - $2');

        fs.writeFileSync(changelogPath, content);
        console.log(`[${pkg}] Normalized headers.`);
    }
});

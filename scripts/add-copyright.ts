
import * as fs from 'node:fs';
import * as path from 'node:path';

const ARTICLES_DIR = path.resolve(__dirname, '../distribution/articles');
const COPYRIGHT_NOTICE = "Copyright (c) 2026 Ofri Peretz. All rights reserved.";
const COPYRIGHT_REGEX = /Copyright \(c\) \d{4} Ofri Peretz\. All rights reserved\./i; // Case insensitive just in case

function walkDir(dir: string, callback: (filePath: string) => void) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, callback);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      callback(fullPath);
    }
  }
}

let updatedCount = 0;
let skippedCount = 0; // If it already matches exactly 2026

console.log('🚀 Adding/Updating Copyright Notices...');

walkDir(ARTICLES_DIR, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content;

  if (COPYRIGHT_REGEX.test(content)) {
    // It exists, check if it needs update
    if (content.includes(COPYRIGHT_NOTICE)) {
      // Already has the exact 2026 string
      skippedCount++;
      return;
    } else {
      // Has a copyright string but not the 2026 one (e.g. 2025)
      // We replace the match
      newContent = content.replace(COPYRIGHT_REGEX, COPYRIGHT_NOTICE);
      console.log(`📝 Updated year in: ${path.relative(ARTICLES_DIR, filePath)}`);
    }
  } else {
    // Doesn't exist, append it.
    // Ensure we have a newline before it.
    if (!content.endsWith('\n')) {
        newContent += '\n';
    }
    // Add an extra newline for separation if needed
    if (!newContent.endsWith('\n\n')) {
         newContent += '\n';
    }
    newContent += COPYRIGHT_NOTICE;
    console.log(`➕ Added notice to: ${path.relative(ARTICLES_DIR, filePath)}`);
  }

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    updatedCount++;
  }
});

console.log('\nSummary:');
console.log(`✅ Updated/Added: ${updatedCount} files`);
console.log(`⏭️  Already correct: ${skippedCount} files`);

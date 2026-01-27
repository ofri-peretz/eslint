#!/usr/bin/env node
/**
 * Sync Philosophy Section across all README.md files
 * 
 * This script ensures all plugin READMEs have a consistent Philosophy section
 * that reflects the Interlace ecosystem values.
 * 
 * Usage: npx ts-node scripts/sync-philosophy.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const PHILOSOPHY_SECTION = `## Philosophy

**Interlace** fosters **strength through integration**. We **interlace** quality directly into your workflow, catching issues before they ship. Tools should **guide rather than gatekeep**, providing educational feedback that strengthens developers.

**Why an independent ecosystem?** 🚀 Ship fast without upstream bureaucracy • 🤖 AI-optimized messages (CWE, severity, fixes) • ⚡ Unified codebase for performance • 🏗️ Consistent patterns across all plugins • 📚 Educational "why" explanations

All rules are **clean-room implementations** — familiar naming conventions, better engineering.`;

interface SyncResult {
  file: string;
  action: 'updated' | 'added' | 'skipped';
  reason?: string;
}

async function findReadmeFiles(): Promise<string[]> {
  const packagesDir = path.join(__dirname, '..', 'packages');
  const pattern = path.join(packagesDir, '**/README.md');
  
  const files = await glob(pattern, { 
    ignore: ['**/node_modules/**', '**/dist/**'] 
  });
  
  return files.filter(f => f.includes('eslint-plugin-'));
}

function hasPhilosophySection(content: string): boolean {
  return /^## Philosophy/m.test(content);
}

function extractPhilosophySection(content: string): string | null {
  const match = content.match(/## Philosophy[\s\S]*?(?=\n## [A-Z]|\n---\s*\n|$)/);
  return match ? match[0].trim() : null;
}

function replacePhilosophySection(content: string, newSection: string): string {
  const philosophyRegex = /## Philosophy[\s\S]*?(?=\n## [A-Z]|\n---\s*\n)/;
  
  if (philosophyRegex.test(content)) {
    return content.replace(philosophyRegex, newSection + '\n\n');
  }
  
  // If no next section found, try to find end of file pattern
  const endRegex = /## Philosophy[\s\S]*$/;
  if (endRegex.test(content)) {
    return content.replace(endRegex, newSection + '\n');
  }
  
  return content;
}

function addPhilosophySection(content: string): string {
  // Add after Description section if it exists
  const descriptionMatch = content.match(/## Description[\s\S]*?(?=\n## [A-Z])/);
  if (descriptionMatch) {
    const insertPoint = content.indexOf(descriptionMatch[0]) + descriptionMatch[0].length;
    return (
      content.slice(0, insertPoint) +
      '\n\n' +
      PHILOSOPHY_SECTION +
      '\n' +
      content.slice(insertPoint)
    );
  }
  
  // Otherwise add after first header block
  const firstHeaderEnd = content.match(/<\/p>\s*\n\s*\n/);
  if (firstHeaderEnd) {
    const insertPoint = content.indexOf(firstHeaderEnd[0]) + firstHeaderEnd[0].length;
    return (
      content.slice(0, insertPoint) +
      PHILOSOPHY_SECTION +
      '\n\n' +
      content.slice(insertPoint)
    );
  }
  
  // Fallback: add at the beginning after title
  return content.replace(/^(# .+\n\n)/, `$1${PHILOSOPHY_SECTION}\n\n`);
}

async function syncPhilosophy(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  const readmeFiles = await findReadmeFiles();
  
  console.log(`Found ${readmeFiles.length} plugin README files\n`);
  
  for (const file of readmeFiles) {
    const relativePath = path.relative(process.cwd(), file);
    let content = fs.readFileSync(file, 'utf-8');
    
    if (hasPhilosophySection(content)) {
      const existingSection = extractPhilosophySection(content);
      
      // Check if it's already up to date
      if (existingSection?.includes('Why an Independent Ecosystem?')) {
        results.push({ file: relativePath, action: 'skipped', reason: 'Already up to date' });
        continue;
      }
      
      // Update existing section
      content = replacePhilosophySection(content, PHILOSOPHY_SECTION);
      fs.writeFileSync(file, content);
      results.push({ file: relativePath, action: 'updated' });
    } else {
      // Add new section
      content = addPhilosophySection(content);
      fs.writeFileSync(file, content);
      results.push({ file: relativePath, action: 'added' });
    }
  }
  
  return results;
}

async function main(): Promise<void> {
  console.log('🔄 Syncing Philosophy sections across plugin READMEs...\n');
  
  try {
    const results = await syncPhilosophy();
    
    console.log('\n📊 Results:\n');
    
    const updated = results.filter(r => r.action === 'updated');
    const added = results.filter(r => r.action === 'added');
    const skipped = results.filter(r => r.action === 'skipped');
    
    if (updated.length > 0) {
      console.log('✅ Updated:');
      updated.forEach(r => console.log(`   - ${r.file}`));
    }
    
    if (added.length > 0) {
      console.log('➕ Added:');
      added.forEach(r => console.log(`   - ${r.file}`));
    }
    
    if (skipped.length > 0) {
      console.log('⏭️  Skipped (already up to date):');
      skipped.forEach(r => console.log(`   - ${r.file}`));
    }
    
    console.log(`\n✨ Done! ${updated.length + added.length} files modified, ${skipped.length} skipped.`);
  } catch (error) {
    console.error('❌ Error syncing Philosophy sections:', error);
    process.exit(1);
  }
}

main();

#!/usr/bin/env node

/**
 * Sync Rule Documentation Script
 * 
 * Reads rule documentation from packages and generates MDX files
 * for the Fumadocs documentation site.
 * 
 * The original .md files remain the source of truth.
 * 
 * Usage: npx tsx scripts/sync-rule-docs.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Plugin mapping: package name -> docs folder name
const PLUGIN_MAPPING: Record<string, string> = {
  'eslint-plugin-secure-coding': 'secure-coding',
  'eslint-plugin-pg': 'pg',
  'eslint-plugin-jwt': 'jwt',
  'eslint-plugin-crypto': 'crypto',
  'eslint-plugin-express-security': 'express-security',
  'eslint-plugin-nestjs-security': 'nestjs-security',
  'eslint-plugin-lambda-security': 'lambda-security',
  'eslint-plugin-browser-security': 'browser-security',
  'eslint-plugin-mongodb-security': 'mongodb-security',
  'eslint-plugin-vercel-ai-security': 'vercel-ai-security',
  'eslint-plugin-import-next': 'import-next',
  'eslint-plugin-architecture': 'architecture',
  'eslint-plugin-quality': 'quality',
  'eslint-plugin-react-a11y': 'react-a11y',
  'eslint-plugin-react-features': 'react-features',
};

const ROOT_DIR = path.join(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');
const DOCS_CONTENT_DIR = path.join(ROOT_DIR, 'apps', 'docs', 'content', 'docs');

interface RuleDoc {
  name: string;
  title: string;
  description: string;
  content: string;
}

/**
 * Extract title from markdown content
 * Support both H1 and frontmatter 'title'
 */
function extractTitle(content: string): string {
  // Check for frontmatter title
  const fmMatch = content.match(/^---\s*\n[\s\S]*?title:\s*(.+)\n[\s\S]*?---/);
  if (fmMatch) return fmMatch[1].trim();

  // Fallback to H1
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : '';
}

/**
 * Extract description from markdown content
 */
function extractDescription(content: string): string {
  // Check for frontmatter description
  const fmMatch = content.match(/^---\s*\n[\s\S]*?description:\s*(.+)\n[\s\S]*?---/);
  if (fmMatch) return fmMatch[1].trim().replace(/^['"]|['"]$/g, '');

  // Fallback to extraction logic
  const withoutTitle = content.replace(/^#\s+.+$/m, '').replace(/^---[\s\S]*?---/m, '').trim();
  
  const lines = withoutTitle.split('\n');
  let descLine = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('>')) {
      descLine = trimmed.replace(/^>\s*\*\*Keywords:\*\*.*$/, '').replace(/^>\s*/, '');
      if (descLine) break;
      continue;
    }
    descLine = trimmed;
    break;
  }
  
  return descLine
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .slice(0, 160);
}

/**
 * Escape a string for use in YAML frontmatter
 */
function escapeYamlString(str: string | null | undefined): string {
  if (!str) return '""';
  
  let cleaned = str
    .replace(/\\/g, '')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // If it's already a CWE reference like 'CWE: [CWE-XXX](...)' we might want to keep parts
  // but for frontmatter description we strip the link
  if (cleaned.startsWith('CWE:')) {
     cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  }

  const needsQuoting = /[:#{}\[\],&*?|<>=!%@`'"]/.test(cleaned);
  if (needsQuoting) {
    cleaned = cleaned.replace(/"/g, "'");
    return `"${cleaned}"`;
  }
  
  return cleaned;
}

/**
 * Convert markdown to MDX format
 */
function convertToMdx(doc: RuleDoc): string {
  let content = doc.content;
  
  // Remove existing frontmatter from source to avoid duplication
  content = content.replace(/^---[\s\S]*?---\n*/, '');
  
  // Remove H1 title
  content = content.replace(/^#\s+.+\n+/, '');
  
  content = content.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');
  
  const description = doc.description || `ESLint rule: ${doc.name}`;
  const title = doc.title || doc.name;
  
  return `---
title: ${escapeYamlString(title)}
description: ${escapeYamlString(description)}
---

${content.trim()}
`;
}


/**
 * Process a single plugin's rule docs
 */
function processPlugin(pluginName: string, docsFolderName: string): void {
  const packageDocsDir = path.join(PACKAGES_DIR, pluginName, 'docs', 'rules');
  const outputDir = path.join(DOCS_CONTENT_DIR, docsFolderName, 'rules');
  
  if (!fs.existsSync(packageDocsDir)) {
    console.log(`⏭️  Skipping ${pluginName} - no docs/rules directory`);
    return;
  }
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const mdFiles = fs.readdirSync(packageDocsDir).filter(f => f.endsWith('.md'));
  const ruleNames: string[] = [];
  
  console.log(`📦 Processing ${pluginName} (${mdFiles.length} rules)`);
  
  for (const mdFile of mdFiles) {
    const ruleName = mdFile.replace('.md', '');
    const mdPath = path.join(packageDocsDir, mdFile);
    const mdxPath = path.join(outputDir, `${ruleName}.mdx`);
    
    try {
      const content = fs.readFileSync(mdPath, 'utf-8');
      
      const doc: RuleDoc = {
        name: ruleName,
        title: extractTitle(content),
        description: extractDescription(content),
        content,
      };
      
      const mdxContent = convertToMdx(doc);
      fs.writeFileSync(mdxPath, mdxContent);
      ruleNames.push(ruleName);
      
    } catch (error) {
      console.error(`  ❌ Error processing ${ruleName}: ${error}`);
    }
  }
  
  // Generate meta.json for navigation
  const metaPath = path.join(outputDir, 'meta.json');
  const metaContent = {
    title: 'Rules',
    pages: ruleNames.sort(),
  };
  fs.writeFileSync(metaPath, JSON.stringify(metaContent, null, 2));
  
  console.log(`  ✅ Generated ${ruleNames.length} rule docs + meta.json`);
}

/**
 * Main function
 */
function main(): void {
  console.log('🔄 Syncing rule documentation from packages to docs...\n');
  
  let totalRules = 0;
  
  for (const [pluginName, docsFolderName] of Object.entries(PLUGIN_MAPPING)) {
    const packageDir = path.join(PACKAGES_DIR, pluginName);
    if (!fs.existsSync(packageDir)) {
      console.log(`⏭️  Skipping ${pluginName} - package not found`);
      continue;
    }
    
    processPlugin(pluginName, docsFolderName);
  }
  
  console.log('\n✨ Documentation sync complete!');
  console.log(`   Run 'cd apps/docs && npm run dev' to preview.`);
}

main();

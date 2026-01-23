#!/usr/bin/env node

/**
 * Sync Rule Documentation Script
 * 
 * Reads rule documentation from packages and generates MDX files
 * for the Fumadocs documentation site.
 * 
 * The original .md files remain the source of truth.
 * 
 * Usage: pnpm tsx scripts/sync-rule-docs.ts
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
 */
function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : '';
}

/**
 * Extract description from markdown content
 * Usually the first paragraph after the title
 */
function extractDescription(content: string): string {
  // Remove the title
  const withoutTitle = content.replace(/^#\s+.+$/m, '').trim();
  
  // Skip keywords line if present
  const lines = withoutTitle.split('\n');
  let descLine = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('>')) {
      // Extract from blockquote
      descLine = trimmed.replace(/^>\s*\*\*Keywords:\*\*.*$/, '').replace(/^>\s*/, '');
      if (descLine) break;
      continue;
    }
    descLine = trimmed;
    break;
  }
  
  // Clean up and truncate for SEO
  return descLine
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
    .replace(/\*\*/g, '') // Remove bold
    .replace(/`/g, '') // Remove code ticks
    .slice(0, 160);
}

/**
 * Escape a string for use in YAML frontmatter
 * Uses single quotes or strips problematic characters
 */
function escapeYamlString(str: string | null | undefined): string {
  if (!str) return '""';
  
  // Remove backslashes and normalize the string
  let cleaned = str
    .replace(/\\/g, '') // Remove backslashes entirely
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .replace(/\r/g, '') // Remove carriage returns
    .replace(/\t/g, ' ') // Replace tabs with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // If string contains characters that need quoting, use double quotes
  const needsQuoting = /[:#{}\[\],&*?|<>=!%@`'"]/.test(cleaned);
  if (needsQuoting) {
    // Escape double quotes inside the string
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
  
  // The content is already markdown, we just need to add frontmatter
  // Remove the first H1 title as it will be in frontmatter
  content = content.replace(/^#\s+.+\n+/, '');
  
  // Convert HTML comments to MDX comments (MDX doesn't support HTML comments)
  content = content.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');
  
  // Ensure description is never empty
  const description = doc.description || `ESLint rule: ${doc.name}`;
  const title = doc.title || doc.name;
  
  // Build MDX file with properly escaped YAML
  // Note: Fumadocs renders the frontmatter title automatically, so we don't add an H1
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
  console.log(`   Run 'cd apps/docs && pnpm dev' to preview.`);
}

main();

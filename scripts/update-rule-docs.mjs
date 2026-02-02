#!/usr/bin/env node
/**
 * Script to update all rule documentation files with standardized metadata
 * 
 * Usage: node scripts/update-rule-docs.mjs
 * 
 * This script:
 * 1. Reads all rule docs from packages eslint-plugin-* docs rules
 * 2. Parses existing frontmatter and content
 * 3. Adds/updates metadata (description, category, severity, tags)
 * 4. Wraps existing summary with rule-summary anchor if not present
 */

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGES_DIR = join(__dirname, '..', 'packages');

// Plugin category mapping
const SECURITY_PLUGINS = [
  'eslint-plugin-browser-security',
  'eslint-plugin-secure-coding',
  'eslint-plugin-jwt',
  'eslint-plugin-node-security',
  'eslint-plugin-crypto',
  'eslint-plugin-mongodb-security',
  'eslint-plugin-pg',
  'eslint-plugin-express-security',
  'eslint-plugin-nestjs-security',
  'eslint-plugin-lambda-security',
  'eslint-plugin-vercel-ai-security',
];

// CWE patterns to extract from content
const CWE_PATTERN = /CWE-(\d+)/gi;
const OWASP_PATTERN = /A0?(\d+):?20\d{2}/gi;

/**
 * Parse existing frontmatter from markdown content
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: {}, body: content };
  
  const frontmatterText = match[1];
  const body = content.slice(match[0].length).trim();
  const frontmatter = {};
  
  // Parse YAML-like frontmatter
  for (const line of frontmatterText.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    
    // Handle quoted strings
    if ((value.startsWith("'") && value.endsWith("'")) || 
        (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    
    // Handle arrays
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        value = JSON.parse(value.replace(/'/g, '"'));
      } catch {
        value = value.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, ''));
      }
    }
    
    frontmatter[key] = value;
  }
  
  return { frontmatter, body };
}

/**
 * Extract a short description from the document body
 */
function extractDescription(body, ruleName) {
  // Remove rule-summary anchor content first to find it
  const anchorMatch = body.match(/<!--\s*@rule-summary\s*-->([\s\S]*?)<!--\s*@\/rule-summary\s*-->/);
  if (anchorMatch) {
    const desc = anchorMatch[1].replace(/[`*~_]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
    const firstSentence = desc.split(/\.\s/)[0];
    return firstSentence.length < 120 ? firstSentence : desc.slice(0, 117) + '...';
  }
  
  // Find first meaningful paragraph
  const lines = body.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty, headers, blockquotes, badges, tables
    if (!trimmed || 
        trimmed.startsWith('>') || 
        trimmed.startsWith('#') || 
        trimmed.startsWith('*') || 
        trimmed.startsWith('|') ||
        trimmed.startsWith('<!--') ||
        trimmed.toLowerCase().includes('keywords:') ||
        trimmed.includes('🚨') ||
        trimmed.includes('💡') ||
        trimmed.includes('⚠️')) {
      continue;
    }
    
    // Found a regular paragraph
    const desc = trimmed.replace(/[`*~_]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
    if (desc.length > 20) {
      const firstSentence = desc.split(/\.\s/)[0];
      return firstSentence.length < 120 ? firstSentence : desc.slice(0, 117) + '...';
    }
  }
  
  // Fallback to rule name converted to sentence
  return ruleName.split('-').filter(p => p !== 'no' && p !== 'require').join(' ');
}

/**
 * Extract CWE references from content
 */
function extractCWE(content) {
  const matches = content.match(CWE_PATTERN);
  if (!matches) return null;
  // Return first unique CWE found
  const cwes = [...new Set(matches.map(m => m.toUpperCase()))];
  return cwes[0] || null;
}

/**
 * Extract OWASP references from content
 */
function extractOWASP(content) {
  const matches = content.match(OWASP_PATTERN);
  if (!matches) return null;
  return matches[0] || null;
}

/**
 * Generate tags from rule name and content
 */
function generateTags(ruleName, pluginName, content) {
  const tags = new Set();
  
  // Add plugin-specific tag
  const pluginShort = pluginName.replace('eslint-plugin-', '');
  tags.add(pluginShort);
  
  // Add from rule name
  const parts = ruleName.split('-').filter(p => p.length > 2 && !['the', 'and', 'for'].includes(p));
  parts.slice(0, 2).forEach(p => tags.add(p));
  
  // Add common security tags if present in content
  const contentLower = content.toLowerCase();
  if (contentLower.includes('injection')) tags.add('injection');
  if (contentLower.includes('xss')) tags.add('xss');
  if (contentLower.includes('csrf')) tags.add('csrf');
  if (contentLower.includes('authentication')) tags.add('auth');
  if (contentLower.includes('authorization')) tags.add('auth');
  if (contentLower.includes('encryption')) tags.add('crypto');
  if (contentLower.includes('cryptograph')) tags.add('crypto');
  
  return [...tags].slice(0, 5);
}

/**
 * Determine severity from content or defaults
 */
function determineSeverity(content, cwe) {
  const contentLower = content.toLowerCase();
  
  // Critical indicators
  if (contentLower.includes('critical') || 
      contentLower.includes('cvss: 9') ||
      contentLower.includes('sql injection') ||
      contentLower.includes('remote code')) {
    return 'critical';
  }
  
  // High indicators
  if (contentLower.includes('high') ||
      contentLower.includes('cvss: 7') ||
      contentLower.includes('cvss: 8') ||
      cwe) {
    return 'high';
  }
  
  // Medium is default for security rules
  if (contentLower.includes('security') || contentLower.includes('vulnerab')) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Check if @rule-summary anchor exists and add if not
 */
function ensureRuleSummaryAnchor(body, description) {
  if (body.includes('@rule-summary')) {
    return body;
  }
  
  // Find where to insert the anchor (after any keywords blockquote, before main content)
  const lines = body.split('\n');
  let insertIdx = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip empty lines and blockquotes
    if (!line || line.startsWith('>')) {
      insertIdx = i + 1;
      continue;
    }
    break;
  }
  
  // Insert the anchor
  const anchorContent = `\n<!-- @rule-summary -->\n${description}\n<!-- @/rule-summary -->\n`;
  lines.splice(insertIdx, 0, anchorContent);
  
  return lines.join('\n');
}

/**
 * Generate updated frontmatter
 */
function generateFrontmatter(existing, ruleName, pluginName, body, isSecurityPlugin) {
  const category = isSecurityPlugin ? 'security' : 'quality';
  const cwe = isSecurityPlugin ? extractCWE(body) : null;
  const owasp = isSecurityPlugin ? extractOWASP(body) : null;
  const description = existing.description && existing.description !== ruleName 
    ? existing.description 
    : extractDescription(body, ruleName);
  const severity = isSecurityPlugin ? determineSeverity(body, cwe) : null;
  const tags = generateTags(ruleName, pluginName, body);
  
  const fm = {
    title: existing.title || ruleName,
    description: description,
    tags: existing.tags || tags,
    category: existing.category || category,
  };
  
  // Add conditional fields
  if (isSecurityPlugin) {
    fm.severity = existing.severity || severity;
    if (cwe) fm.cwe = cwe;
    if (owasp) fm.owasp = owasp;
  }
  
  if (existing.autofix !== undefined) fm.autofix = existing.autofix;
  if (existing.cover_image) fm.cover_image = existing.cover_image;
  
  return fm;
}

/**
 * Serialize frontmatter to YAML
 */
function serializeFrontmatter(fm) {
  const lines = ['---'];
  
  for (const [key, value] of Object.entries(fm)) {
    if (value === null || value === undefined) continue;
    
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map(v => `'${v}'`).join(', ')}]`);
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else {
      // Quote strings that need it
      const needsQuotes = value.includes(':') || value.includes("'") || value.includes('"');
      lines.push(`${key}: ${needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value}`);
    }
  }
  
  lines.push('---');
  return lines.join('\n');
}

/**
 * Process a single rule doc file
 */
async function processRuleDoc(filePath, pluginName) {
  const content = await readFile(filePath, 'utf-8');
  const ruleName = basename(filePath, '.md');
  const isSecurityPlugin = SECURITY_PLUGINS.includes(pluginName);
  
  const { frontmatter, body } = parseFrontmatter(content);
  
  // Generate new frontmatter
  const newFrontmatter = generateFrontmatter(frontmatter, ruleName, pluginName, body, isSecurityPlugin);
  
  // Ensure @rule-summary anchor exists
  const updatedBody = ensureRuleSummaryAnchor(body, newFrontmatter.description);
  
  // Combine and write
  const newContent = `${serializeFrontmatter(newFrontmatter)}\n\n${updatedBody}`;
  
  await writeFile(filePath, newContent, 'utf-8');
  
  return {
    file: filePath,
    ruleName,
    description: newFrontmatter.description,
    category: newFrontmatter.category,
    severity: newFrontmatter.severity,
    cwe: newFrontmatter.cwe,
  };
}

/**
 * Find all rule doc files
 */
async function findRuleDocs() {
  const packages = await readdir(PACKAGES_DIR);
  const ruleDocs = [];
  
  for (const pkg of packages) {
    if (!pkg.startsWith('eslint-plugin-')) continue;
    
    const rulesDir = join(PACKAGES_DIR, pkg, 'docs', 'rules');
    try {
      const stats = await stat(rulesDir);
      if (!stats.isDirectory()) continue;
      
      const files = await readdir(rulesDir);
      for (const file of files) {
        if (file.endsWith('.md') && !file.startsWith('_')) {
          ruleDocs.push({
            path: join(rulesDir, file),
            plugin: pkg,
          });
        }
      }
    } catch {
      // No rules dir for this plugin
      continue;
    }
  }
  
  return ruleDocs;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Finding rule documentation files...\n');
  
  const ruleDocs = await findRuleDocs();
  console.log(`📚 Found ${ruleDocs.length} rule docs across all plugins\n`);
  
  let processed = 0;
  let errors = 0;
  const results = { security: [], quality: [] };
  
  for (const { path, plugin } of ruleDocs) {
    try {
      const result = await processRuleDoc(path, plugin);
      processed++;
      
      if (result.category === 'security') {
        results.security.push(result);
      } else {
        results.quality.push(result);
      }
      
      if (processed % 50 === 0) {
        console.log(`  ✅ Processed ${processed}/${ruleDocs.length} files...`);
      }
    } catch (err) {
      errors++;
      console.error(`  ❌ Error processing ${path}: ${err.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Successfully processed: ${processed} rule docs`);
  console.log(`   - Security rules: ${results.security.length}`);
  console.log(`   - Quality rules: ${results.quality.length}`);
  if (errors > 0) {
    console.log(`❌ Errors: ${errors}`);
  }
  
  // Summary of security rules with CWE
  const withCWE = results.security.filter(r => r.cwe);
  console.log(`\n📊 Security rules with CWE references: ${withCWE.length}/${results.security.length}`);
}

main().catch(console.error);

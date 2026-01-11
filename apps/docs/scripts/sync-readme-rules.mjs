/**
 * Sync README Rules Tables
 * 
 * Parses rules tables from each plugin's README.md and generates JSON files
 * with internal doc links for the ReadmeRulesTable component.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../../');
const packagesDir = path.join(rootDir, 'packages');
const outputDir = path.resolve(__dirname, '../src/data/plugin-rules');

// Plugin slug to package name mapping
const PLUGIN_MAPPINGS = {
  'browser-security': 'eslint-plugin-browser-security',
  'crypto': 'eslint-plugin-crypto',
  'express-security': 'eslint-plugin-express-security',
  'jwt': 'eslint-plugin-jwt',
  'lambda-security': 'eslint-plugin-lambda-security',
  'mongodb-security': 'eslint-plugin-mongodb-security',
  'nestjs-security': 'eslint-plugin-nestjs-security',
  'pg': 'eslint-plugin-pg',
  'secure-coding': 'eslint-plugin-secure-coding',
  'vercel-ai-security': 'eslint-plugin-vercel-ai-security',
  'import-next': 'eslint-plugin-import-next',
};

/**
 * Parse a markdown table and extract rule information
 */
function parseRulesTable(markdown) {
  const rules = [];
  
  // Find all tables in the markdown
  const tableRegex = /\|[^\n]+\|\n\|[-:\s|]+\|\n((?:\|[^\n]+\|\n?)+)/g;
  let tableMatch;
  
  while ((tableMatch = tableRegex.exec(markdown)) !== null) {
    const tableContent = tableMatch[0];
    const rows = tableContent.split('\n').filter(row => row.trim().startsWith('|'));
    
    // Skip header and separator rows
    const dataRows = rows.slice(2);
    
    for (const row of dataRows) {
      const cells = row.split('|').map(cell => cell.trim()).filter(Boolean);
      
      if (cells.length < 2) continue;
      
      // Extract rule name from first cell (may contain markdown link)
      const ruleCell = cells[0];
      const ruleNameMatch = ruleCell.match(/\[([^\]]+)\]\([^)]+\)/);
      const ruleName = ruleNameMatch ? ruleNameMatch[1] : ruleCell.replace(/[`*]/g, '');
      
      // Skip if this doesn't look like a rule name
      if (!ruleName || ruleName.includes('Rule') || ruleName.includes('---')) continue;
      
      // Extract other columns if present
      const rule = {
        name: ruleName,
        cwe: cells[1] || '',
        owasp: cells[2] || '',
        description: cells[3] || '',
        recommended: cells[4]?.includes('💼') || cells[0]?.includes('💼') || false,
        fixable: cells[5]?.includes('🔧') || cells[0]?.includes('🔧') || false,
        hasSuggestions: cells[6]?.includes('💡') || cells[0]?.includes('💡') || false,
      };
      
      // Only add if we have a valid rule name
      if (rule.name && rule.name.length > 0 && !rule.name.includes('|')) {
        rules.push(rule);
      }
    }
  }
  
  return rules;
}

/**
 * Extract the main rules section from README
 */
function extractRulesSection(markdown) {
  // Find the Rules section
  const rulesHeaderMatch = markdown.match(/^##\s*🔐?\s*Rules.*$/m);
  if (!rulesHeaderMatch) {
    // Try alternative headers
    const altMatch = markdown.match(/^##\s*(?:Available\s+)?Rules.*$/im);
    if (!altMatch) return null;
  }
  
  // Extract everything from Rules header to the next major section
  const startIndex = markdown.indexOf(rulesHeaderMatch?.[0] || '## Rules');
  if (startIndex === -1) return null;
  
  const afterStart = markdown.slice(startIndex);
  const nextSectionMatch = afterStart.match(/\n##\s+[^#]/);
  const endIndex = nextSectionMatch 
    ? startIndex + nextSectionMatch.index 
    : markdown.length;
  
  return markdown.slice(startIndex, endIndex);
}

/**
 * Process a single plugin README
 */
function processPlugin(pluginSlug, packageName) {
  const readmePath = path.join(packagesDir, packageName, 'README.md');
  
  if (!fs.existsSync(readmePath)) {
    console.warn(`README not found for ${packageName}`);
    return null;
  }
  
  const markdown = fs.readFileSync(readmePath, 'utf8');
  const rulesSection = extractRulesSection(markdown) || markdown;
  const rules = parseRulesTable(rulesSection);
  
  // Transform rules to include internal links
  const transformedRules = rules.map(rule => ({
    ...rule,
    href: `/docs/${pluginSlug}/rules/${rule.name}`,
  }));
  
  return {
    plugin: pluginSlug,
    package: packageName,
    rules: transformedRules,
    totalRules: transformedRules.length,
    lastSynced: new Date().toISOString(),
  };
}

/**
 * Main sync function
 */
async function main() {
  console.log('Syncing README rules tables...');
  
  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });
  
  const results = {
    success: [],
    errors: [],
  };
  
  for (const [pluginSlug, packageName] of Object.entries(PLUGIN_MAPPINGS)) {
    try {
      const data = processPlugin(pluginSlug, packageName);
      
      if (data && data.rules.length > 0) {
        const outputPath = path.join(outputDir, `${pluginSlug}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        results.success.push(`${pluginSlug}: ${data.rules.length} rules`);
        console.log(`✓ ${pluginSlug}: ${data.rules.length} rules synced`);
      } else {
        results.errors.push(`${pluginSlug}: No rules found`);
        console.warn(`⚠ ${pluginSlug}: No rules found in README`);
      }
    } catch (error) {
      results.errors.push(`${pluginSlug}: ${error.message}`);
      console.error(`✗ ${pluginSlug}: ${error.message}`);
    }
  }
  
  // Write summary file
  const summaryPath = path.join(outputDir, '_sync-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    lastSynced: new Date().toISOString(),
    plugins: Object.keys(PLUGIN_MAPPINGS).length,
    success: results.success.length,
    errors: results.errors.length,
    details: results,
  }, null, 2));
  
  console.log(`\nSync complete: ${results.success.length} succeeded, ${results.errors.length} errors`);
}

main().catch(console.error);

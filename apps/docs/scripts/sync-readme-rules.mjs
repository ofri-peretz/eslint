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
// Plugin slug to package name mapping
export const PLUGIN_MAPPINGS = {
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
 * Strictly enforces the standardized 10-column layout.
 */
/**
 * Parse a markdown table and extract rule information
 * Strictly enforces the standardized 10-column layout.
 */
export function parseRulesTable(markdown) {
  const rules = [];
  
  // Find all tables with header row
  const tableRegex = /(\|[^\n]+\|)\n(\|[-:\s|]+\|)\n((?:\|[^\n]+\|\n?)+)/g;
  let tableMatch;
  
  while ((tableMatch = tableRegex.exec(markdown)) !== null) {
    const headerRow = tableMatch[1];
    const dataRowsContent = tableMatch[3];
    
    // Parse header cells
    const headerCells = headerRow.split('|').map(cell => cell.trim()).filter(Boolean);
    
    /**
     * STANDARD 10-COLUMN SCHEMA:
     * | Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
     */
    const isRulesTable = headerCells.length === 10 && 
                         headerCells[0].toLowerCase() === 'rule' &&
                         headerCells[1].toLowerCase().includes('cwe') &&
                         !headerCells.some(h => h.toLowerCase() === 'category') &&
                         !headerCells.some(h => h.toLowerCase() === 'plugin');
    
    if (!isRulesTable) {
      continue;
    }
    
    const dataRows = dataRowsContent.split('\n').filter(row => row.trim().startsWith('|'));
    
    for (const row of dataRows) {
      // Split by | but PRESERVE empty cells
      // Leading/trailing | and 10 columns = 12 parts
      const rawCells = row.split('|');
      const cells = rawCells.map(cell => cell.trim());
      
      // Ensure we have correct number of cells (12 including empty ends)
      if (cells.length < 11) continue;
      
      const shift = row.trim().startsWith('|') ? 1 : 0;
      
      // Extract rule name and strip markdown
      const ruleCell = cells[0 + shift];
      
      // 1. SKIP sub-category headers (e.g., "| **Injection** | | | |")
      // These usually have only one populated cell or use bolding without backticks
      if (ruleCell.startsWith('**') && ruleCell.endsWith('**') && !ruleCell.includes('`') && !ruleCell.includes('[')) {
        continue;
      }

      // 2. SKIP empty rows or placeholder rows
      if (!ruleCell || ruleCell === '---' || ruleCell.length < 2) continue;

      // 3. Extract Name from [name](link) or `name`
      let ruleName = ruleCell;
      const ruleLinkMatch = ruleCell.match(/\[([^\]]+)\]/);
      if (ruleLinkMatch) {
        ruleName = ruleLinkMatch[1];
      }
      ruleName = ruleName.replace(/[`*~]/g, '').trim();
      
      // 4. FINAL INTEGRITY GUARD:
      // If the cell content contains "A01", "CWE", or multiple spaces, it's likely not a rule slug
      if (ruleName.includes(' ') || /^[AM]\d+/.test(ruleName) || /^CWE-\d+/.test(ruleName)) {
        continue;
      }
      
      // Helper to strip markdown from technical cells
      const stripMd = (val) => {
        if (!val) return '';
        return val.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1').replace(/[`*~]/g, '').trim();
      };
      
      const rule = {
        name: ruleName,
        cwe: stripMd(cells[1 + shift]),
        owasp: stripMd(cells[2 + shift]),
        cvss: stripMd(cells[3 + shift]),
        description: cells[4 + shift] || '',
        recommended: cells[5 + shift].includes('💼'),
        warns: cells[6 + shift].includes('⚠️'),
        fixable: cells[7 + shift].includes('🔧'),
        hasSuggestions: cells[8 + shift].includes('💡'),
        deprecated: cells[9 + shift].includes('🚫'),
      };
      
      if (rule.name && !rule.name.includes('|')) {
        rules.push(rule);
      }
    }
  }
  
  return rules;
}

/**
 * Extract the main rules section from README
 */
/**
 * Extract the main rules section from README
 */
export function extractRulesSection(markdown) {
  // Find the Rules section
  let rulesHeaderMatch = markdown.match(/^##\s*🔐?\s*75 Active Security Rules.*$/m) || 
                           markdown.match(/^##\s*🔐?\s*Rules.*$/m);
  
  if (!rulesHeaderMatch) {
    // Try alternative headers
    rulesHeaderMatch = markdown.match(/^##\s*(?:Available\s+)?Rules.*$/im);
    if (!rulesHeaderMatch) return null;
  }
  
  // Extract everything from Rules header to the next major section
  const startIndex = markdown.indexOf(rulesHeaderMatch[0]);
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
/**
 * Process a single plugin README
 */
export function processPlugin(pluginSlug, packageName) {
  const readmePath = path.join(packagesDir, packageName, 'README.md');
  
  if (!fs.existsSync(readmePath)) {
    console.warn(`README not found for ${packageName}`);
    return null;
  }
  
  const markdown = fs.readFileSync(readmePath, 'utf8');
  const rulesSection = extractRulesSection(markdown) || markdown;
  
  const rules = [];
  let currentCategory = "General";
  
  // Split section by lines to track categories
  const lines = rulesSection.split('\n');
  let tableBuffer = [];
  let inTable = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect Category (### Subheaders)
    const categoryMatch = line.match(/^###\s+(.+)$/);
    if (categoryMatch) {
      // If we were in a table, process it BEFORE changing category
      if (inTable && tableBuffer.length >= 3) {
        const tableContent = tableBuffer.join('\n');
        const parsedRules = parseRulesTable(tableContent);
        parsedRules.forEach(rule => {
          rules.push({
            ...rule,
            category: currentCategory,
            href: `/docs/${pluginSlug}/rules/${rule.name}`,
          });
        });
        tableBuffer = [];
        inTable = false;
      }
      currentCategory = categoryMatch[1].replace(/\(\d+\s+rules\)/, '').trim();
      continue;
    }
    
    // Detect Table
    if (line.startsWith('|')) {
      tableBuffer.push(lines[i]);
      inTable = true;
    } else if (inTable) {
      // End of table - process buffer
      if (tableBuffer.length >= 3) {
        const tableContent = tableBuffer.join('\n');
        const parsedRules = parseRulesTable(tableContent);
        parsedRules.forEach(rule => {
          rules.push({
            ...rule,
            category: currentCategory,
            href: `/docs/${pluginSlug}/rules/${rule.name}`,
          });
        });
      }
      tableBuffer = [];
      inTable = false;
    }
  }
  
  // Final buffer flush
  if (tableBuffer.length >= 3) {
    const tableContent = tableBuffer.join('\n');
    const parsedRules = parseRulesTable(tableContent);
    parsedRules.forEach(rule => {
      rules.push({
        ...rule,
        category: currentCategory,
        href: `/docs/${pluginSlug}/rules/${rule.name}`,
      });
    });
  }
  
  // De-duplicate rules by name (take the one with non-empty info if exists)
  const dedupedRules = [];
  const names = new Set();
  
  for (const rule of rules) {
    if (!names.has(rule.name)) {
      dedupedRules.push(rule);
      names.add(rule.name);
    }
  }
  
  return {
    plugin: pluginSlug,
    package: packageName,
    rules: dedupedRules,
    totalRules: dedupedRules.length,
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
  
  if (results.errors.length > 0) {
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

/**
 * README Fetcher with ISR Caching
 * 
 * Fetches plugin README.md files from GitHub raw content
 * with 1-hour ISR revalidation (can be invalidated instantly via webhook)
 */

import 'server-only';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/ofri-peretz/eslint/main/packages';

export interface ParsedReadme {
  introduction: string;
  rules: ParsedRule[];
  installation: string;
  whenToUse: string;
  rawContent: string;
}

export interface ParsedRule {
  name: string;
  cwe: string;
  owasp: string;
  description: string;
  recommended: boolean;
  fixable: boolean;
  hasSuggestions: boolean;
  href: string;
}

/**
 * Fetch and parse README from GitHub with ISR caching
 */
export async function fetchReadme(pluginSlug: string): Promise<ParsedReadme | null> {
  const packageName = `eslint-plugin-${pluginSlug}`;
  const url = `${GITHUB_RAW_BASE}/${packageName}/README.md`;
  
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 }, // 1 hour ISR cache
    });
    
    if (!res.ok) {
      console.error(`Failed to fetch README for ${pluginSlug}: ${res.status}`);
      return null;
    }
    
    const markdown = await res.text();
    return parseReadme(markdown, pluginSlug);
  } catch (error) {
    console.error(`Error fetching README for ${pluginSlug}:`, error);
    return null;
  }
}

/**
 * Parse README markdown into structured sections
 */
function parseReadme(markdown: string, pluginSlug: string): ParsedReadme {
  return {
    introduction: extractIntroduction(markdown),
    rules: extractRules(markdown, pluginSlug),
    installation: extractInstallation(markdown),
    whenToUse: extractWhenToUse(markdown),
    rawContent: markdown,
  };
}

/**
 * Extract introduction paragraph (first substantial paragraph after badges)
 */
function extractIntroduction(markdown: string): string {
  // Skip badge lines and find first real paragraph
  const lines = markdown.split('\n');
  let foundHeader = false;
  let intro: string[] = [];
  
  for (const line of lines) {
    // Skip badges and empty lines at start
    if (line.startsWith('[![') || line.startsWith('# ') || line.trim() === '') {
      if (line.startsWith('# ')) foundHeader = true;
      continue;
    }
    
    // Skip blockquote description (starts with >)
    if (line.startsWith('>')) {
      intro.push(line.slice(1).trim());
      continue;
    }
    
    // Stop at next section
    if (line.startsWith('## ') && foundHeader) {
      break;
    }
    
    if (foundHeader && line.trim()) {
      intro.push(line.trim());
    }
  }
  
  return intro.join(' ').trim();
}

/**
 * Extract and parse rules tables
 * Only processes tables where the first header cell contains "Rule"
 */
function extractRules(markdown: string, pluginSlug: string): ParsedRule[] {
  const rules: ParsedRule[] = [];
  
  // Find all tables in the markdown - capture header row too
  const tableRegex = /(\|[^\n]+\|)\n(\|[-:\s|]+\|)\n((?:\|[^\n]+\|\n?)+)/g;
  let tableMatch;
  
  while ((tableMatch = tableRegex.exec(markdown)) !== null) {
    const headerRow = tableMatch[1];
    const dataRowsContent = tableMatch[3];
    
    // Only process tables where first column header is "Rule"
    const headerCells = headerRow.split('|').map(cell => cell.trim()).filter(Boolean);
    if (!headerCells[0] || !headerCells[0].toLowerCase().includes('rule')) {
      continue; // Skip non-rules tables (OWASP coverage tables, etc.)
    }
    
    const dataRows = dataRowsContent.split('\n').filter(row => row.trim().startsWith('|'));
    
    for (const row of dataRows) {
      const cells = row.split('|').map(cell => cell.trim()).filter(Boolean);
      
      if (cells.length < 2) continue;
      
      // Extract rule name from first cell (may contain markdown link)
      const ruleCell = cells[0];
      const ruleNameMatch = ruleCell.match(/\[([^\]]+)\]\(([^)]+)\)/);
      const ruleName = ruleNameMatch ? ruleNameMatch[1] : ruleCell.replace(/[`*~]/g, '');
      
      // Skip invalid rule names or header remnants
      if (!ruleName || ruleName.includes('---') || ruleName.length < 2) continue;
      
      // Detect column structure based on header
      // Common structures:
      // | Rule | CWE | OWASP | Description | 💼 | 🔧 | 💡 |
      // | Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 |
      const hasCVSS = headerCells.some(h => h.toLowerCase().includes('cvss'));
      const descIndex = hasCVSS ? 4 : 3;
      
      const rule: ParsedRule = {
        name: ruleName,
        cwe: cells[1] || '',
        owasp: cells[2] || '',
        description: cells[descIndex] || cells[3] || '',
        recommended: row.includes('💼'),
        fixable: row.includes('🔧'),
        hasSuggestions: row.includes('💡'),
        href: `/docs/${pluginSlug}/rules/${ruleName}`,
      };
      
      // Only add if we have a valid rule name (not deprecated markers, etc.)
      if (rule.name && rule.name.length > 0 && !rule.name.includes('|')) {
        rules.push(rule);
      }
    }
  }
  
  return rules;
}

/**
 * Extract installation commands
 */
function extractInstallation(markdown: string): string {
  const match = markdown.match(/## 📦 Installation\n\n```bash\n([\s\S]*?)```/);
  if (match) {
    return match[1].trim();
  }
  
  // Fallback: find any npm install command
  const npmMatch = markdown.match(/npm install[^\n]+/);
  return npmMatch ? npmMatch[0] : '';
}

/**
 * Extract "When to Use" section
 */
function extractWhenToUse(markdown: string): string {
  const match = markdown.match(/## 🎯 Why This Plugin\?\n\n([\s\S]*?)(?=\n## )/);
  if (match) {
    return match[1].trim();
  }
  
  // Try alternative header
  const altMatch = markdown.match(/## When to Use\n\n([\s\S]*?)(?=\n## )/);
  return altMatch ? altMatch[1].trim() : '';
}

/**
 * Get cached readme data with fallback to static JSON
 */
export async function getReadmeWithFallback(pluginSlug: string): Promise<ParsedReadme | null> {
  const readme = await fetchReadme(pluginSlug);
  
  if (readme) {
    return readme;
  }
  
  // Fallback to static JSON data if GitHub fetch fails
  try {
    const staticData = await import(`@/data/plugin-rules/${pluginSlug}.json`);
    return {
      introduction: '',
      rules: staticData.rules || [],
      installation: '',
      whenToUse: '',
      rawContent: '',
    };
  } catch {
    return null;
  }
}

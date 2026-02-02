/**
 * RulesTable - Fetches and displays plugin rules from README.md
 * 
 * Parses the rules table from README and renders with links to individual rule docs.
 * Uses the same parsing logic as the archive's ReadmeRulesTable.
 */

import Link from 'next/link';
import { Briefcase, Wrench, Lightbulb, AlertTriangle, ExternalLink } from 'lucide-react';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/ofri-peretz/eslint/main/packages';

// Security plugins that should link to /docs/security/
const SECURITY_PLUGINS = [
  'browser-security',
  'secure-coding',
  'jwt',
  'node-security',
  'crypto',
  'mongodb-security',
  'pg',
  'express-security',
  'nestjs-security',
  'lambda-security',
  'vercel-ai-security',
];

interface RulesTableProps {
  /** Plugin slug (e.g., 'import-next', 'browser-security') */
  plugin: string;
  /** Optional: Limit number of rules shown */
  limit?: number;
  /** Optional: Show compact view */
  compact?: boolean;
  /** Optional: Show links column instead of description */
  showLinks?: boolean;
}

interface ParsedRule {
  name: string;
  description: string;
  recommended: boolean;
  fixable: boolean;
  hasSuggestions: boolean;
  warns: boolean;
  deprecated: boolean;
  cwe?: string;
  owasp?: string;
  href: string;
}

/**
 * Determine the category path for a plugin
 */
function getPluginCategory(plugin: string): 'security' | 'quality' {
  return SECURITY_PLUGINS.includes(plugin) ? 'security' : 'quality';
}

/**
 * Fetch README and parse rules table
 */
async function fetchRules(plugin: string): Promise<ParsedRule[]> {
  const packageName = `eslint-plugin-${plugin}`;
  const url = `${GITHUB_RAW_BASE}/${packageName}/README.md`;
  const category = getPluginCategory(plugin);
  
  try {
    const res = await fetch(url, {
      next: { revalidate: 21600 }, // 6 hour ISR cache
    });
    
    if (!res.ok) {
      console.error(`[RulesTable] Failed to fetch ${plugin}: ${res.status}`);
      return [];
    }
    
    const markdown = await res.text();
    const rules = parseRulesFromReadme(markdown, plugin, category);
    
    // Fetch descriptions from individual rule docs (in parallel)
    const rulesWithDescriptions = await fetchRuleDescriptions(plugin, rules);
    
    return rulesWithDescriptions;
  } catch (error) {
    console.error(`[RulesTable] Error fetching ${plugin}:`, error);
    return [];
  }
}

/**
 * Fetch descriptions from individual rule docs
 * Priority: 1) frontmatter.description  2) @rule-summary anchor  3) blockquote fallback
 */
async function fetchRuleDescriptions(plugin: string, rules: ParsedRule[]): Promise<ParsedRule[]> {
  const packageName = `eslint-plugin-${plugin}`;
  
  const fetchPromises = rules.map(async (rule) => {
    try {
      const ruleDocUrl = `${GITHUB_RAW_BASE}/${packageName}/docs/rules/${rule.name}.md`;
      const res = await fetch(ruleDocUrl, {
        next: { revalidate: 21600 }, // 6 hour cache
      });
      
      if (!res.ok) {
        return rule;
      }
      
      const content = await res.text();
      
      // 1. Try to extract description from frontmatter
      const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        // Look for description field (not just the title repeated)
        const descMatch = frontmatter.match(/^description:\s*["']?(.+?)["']?\s*$/m);
        if (descMatch && descMatch[1] && descMatch[1] !== rule.name && descMatch[1].length > 15) {
          return { ...rule, description: descMatch[1].trim() };
        }
      }
      
      // 2. Try to extract from @rule-summary anchor
      const anchorMatch = content.match(/<!--\s*@rule-summary\s*-->([\s\S]*?)<!--\s*@\/rule-summary\s*-->/);
      if (anchorMatch && anchorMatch[1]) {
        const desc = anchorMatch[1].replace(/[`*~_]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
        if (desc && desc.length > 10) {
          // Take first sentence or first 150 chars
          const firstSentence = desc.split(/\.\s/)[0];
          return { ...rule, description: firstSentence.length < 150 ? firstSentence : desc.slice(0, 147) + '...' };
        }
      }
      
      // 3. Fallback: Find first paragraph after frontmatter (not a blockquote, not keywords)
      const frontmatterEnd = content.indexOf('---', 3);
      if (frontmatterEnd !== -1) {
        const afterFrontmatter = content.slice(frontmatterEnd + 3).trim();
        const lines = afterFrontmatter.split('\n');
        
        for (const line of lines) {
          const trimmed = line.trim();
          // Skip empty lines, blockquotes, headers, and badges
          if (!trimmed || trimmed.startsWith('>') || trimmed.startsWith('#') || 
              trimmed.startsWith('*') || trimmed.startsWith('|') ||
              trimmed.toLowerCase().includes('keywords:')) {
            continue;
          }
          // Found a regular paragraph
          const desc = trimmed.replace(/[`*~_]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
          if (desc && desc.length > 20 && !desc.includes('🚨') && !desc.includes('💡')) {
            return { ...rule, description: desc.length < 150 ? desc : desc.slice(0, 147) + '...' };
          }
        }
      }
      
      return rule;
    } catch {
      return rule;
    }
  });
  
  return Promise.all(fetchPromises);
}

/**
 * Strip markdown formatting from a string
 */
function stripMarkdown(text: string): string {
  if (!text) return '';
  
  // Remove markdown links, keeping only the text part
  let result = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove backticks, bold, italic markers
  result = result.replace(/[`*~_]/g, '');
  
  // Remove any remaining URLs or file paths
  result = result.replace(/\(\.\/[^)]+\)/g, '');
  result = result.replace(/https?:\/\/[^\s]+/g, '');
  
  return result.trim();
}

/**
 * Parse rules from README markdown tables
 */
function parseRulesFromReadme(markdown: string, plugin: string, category: 'security' | 'quality'): ParsedRule[] {
  const rules: ParsedRule[] = [];
  
  // Find markdown tables with Rule column
  const tableRegex = /(\|[^\n]+\|)\n(\|[-:\s|]+\|)\n((?:\|[^\n]+\|\n?)+)/g;
  let tableMatch;
  
  while ((tableMatch = tableRegex.exec(markdown)) !== null) {
    const headerRow = tableMatch[1];
    const dataRowsContent = tableMatch[3];
    
    const headerCells = headerRow.split('|').map(cell => cell.trim()).filter(c => c !== '');
    const ruleIdx = headerCells.findIndex(h => h.toLowerCase().includes('rule'));
    
    // Only process tables with Rule column
    if (ruleIdx === -1) continue;
    
    const cweIdx = headerCells.findIndex(h => h.toLowerCase() === 'cwe');
    const owaspIdx = headerCells.findIndex(h => h.toLowerCase() === 'owasp');
    
    const dataRows = dataRowsContent.split('\n').filter(row => row.trim().startsWith('|'));
    
    for (const row of dataRows) {
      const cells = row.split('|').map(cell => cell.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
      
      if (cells.length < headerCells.length) continue;
      
      const ruleCell = cells[ruleIdx];
      if (!ruleCell || ruleCell.startsWith('**A') || ruleCell === '') continue;
      
      // Extract rule name from markdown link
      const ruleNameMatch = ruleCell.match(/\[([^\]]+)\]\(([^)]+)\)/);
      const ruleName = (ruleNameMatch ? ruleNameMatch[1] : ruleCell).replace(/[`*~]/g, '');
      
      if (!ruleName || ruleName.includes('|') || ruleName.length < 2) continue;
      
      rules.push({
        name: ruleName,
        description: '', // Will be filled by fetchRuleDescriptions
        recommended: row.includes('💼'),
        warns: row.includes('⚠️'),
        fixable: row.includes('🔧'),
        hasSuggestions: row.includes('💡'),
        deprecated: row.includes('🚫'),
        cwe: cweIdx !== -1 ? stripMarkdown(cells[cweIdx] || '') : undefined,
        owasp: owaspIdx !== -1 ? stripMarkdown(cells[owaspIdx] || '') : undefined,
        href: `/docs/${category}/plugin-${plugin}/rules/${ruleName}`,
      });
    }
  }
  
  return rules;
}

export async function RulesTable({ plugin, limit, compact, showLinks }: RulesTableProps) {
  const rules = await fetchRules(plugin);
  const displayRules = limit ? rules.slice(0, limit) : rules;
  
  if (rules.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Unable to parse rules from README. Please check the{' '}
          <a 
            href={`https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-${plugin}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            source repository
          </a>.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-fd-muted-foreground pb-3 border-b border-fd-border">
        <span className="font-medium">Legend:</span>
        <span className="flex items-center gap-1">
          <Briefcase className="h-3.5 w-3.5 text-fd-primary" />
          Recommended
        </span>
        <span className="flex items-center gap-1">
          <Wrench className="h-3.5 w-3.5 text-green-500" />
          Fixable
        </span>
        <span className="flex items-center gap-1">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
          Suggestions
        </span>
        <span className="flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
          Warns
        </span>
      </div>
      
      {/* Rules Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-fd-border">
              <th className="text-left py-2 px-3 font-medium">Rule</th>
              <th className="text-center py-2 px-3 font-medium w-12">💼</th>
              <th className="text-center py-2 px-3 font-medium w-12">🔧</th>
              <th className="text-center py-2 px-3 font-medium w-12">💡</th>
              <th className="text-center py-2 px-3 font-medium w-12">⚠️</th>
              <th className="text-center py-2 px-3 font-medium w-14">Docs</th>
            </tr>
          </thead>
          <tbody>
            {displayRules.map((rule, idx) => (
              <tr key={idx} className="border-b border-fd-border/50 hover:bg-fd-muted/50">
                <td className="py-2 px-3">
                  <Link 
                    href={rule.href}
                    className="font-mono text-fd-primary hover:underline"
                  >
                    {rule.name}
                  </Link>
                  {rule.description && (
                    <p className="text-xs text-fd-muted-foreground mt-0.5 max-w-md">
                      {rule.description}
                    </p>
                  )}
                </td>
                <td className="text-center py-2 px-3">
                  {rule.recommended && <Briefcase className="h-4 w-4 text-fd-primary mx-auto" />}
                </td>
                <td className="text-center py-2 px-3">
                  {rule.fixable && <Wrench className="h-4 w-4 text-green-500 mx-auto" />}
                </td>
                <td className="text-center py-2 px-3">
                  {rule.hasSuggestions && <Lightbulb className="h-4 w-4 text-amber-500 mx-auto" />}
                </td>
                <td className="text-center py-2 px-3">
                  {rule.warns && <AlertTriangle className="h-4 w-4 text-orange-500 mx-auto" />}
                </td>
                <td className="text-center py-2 px-3">
                  <Link 
                    href={rule.href}
                    className="inline-flex items-center justify-center text-fd-muted-foreground hover:text-fd-primary"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Summary */}
      <div className="text-sm text-fd-muted-foreground pt-2">
        Showing {displayRules.length} of {rules.length} rules
      </div>
    </div>
  );
}

export default RulesTable;

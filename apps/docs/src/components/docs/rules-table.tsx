/**
 * RulesTable - Fetches and displays plugin rules from README.md
 * 
 * Parses the rules table from README and renders with links to individual rule docs.
 * Uses the same parsing logic as the archive's ReadmeRulesTable.
 */

import Link from 'next/link';
import { Briefcase, Wrench, Lightbulb, AlertTriangle } from 'lucide-react';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/ofri-peretz/eslint/main/packages';

interface RulesTableProps {
  /** Plugin slug (e.g., 'import-next', 'browser-security') */
  plugin: string;
  /** Optional: Limit number of rules shown */
  limit?: number;
  /** Optional: Show compact view */
  compact?: boolean;
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
 * Fetch README and parse rules table
 */
async function fetchRules(plugin: string): Promise<ParsedRule[]> {
  const packageName = `eslint-plugin-${plugin}`;
  const url = `${GITHUB_RAW_BASE}/${packageName}/README.md`;
  
  try {
    const res = await fetch(url, {
      next: { revalidate: 21600 }, // 6 hour ISR cache
    });
    
    if (!res.ok) {
      console.error(`[RulesTable] Failed to fetch ${plugin}: ${res.status}`);
      return [];
    }
    
    const markdown = await res.text();
    return parseRulesFromReadme(markdown, plugin);
  } catch (error) {
    console.error(`[RulesTable] Error fetching ${plugin}:`, error);
    return [];
  }
}

/**
 * Parse rules from README markdown tables
 */
function parseRulesFromReadme(markdown: string, plugin: string): ParsedRule[] {
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
    
    const descIdx = headerCells.findIndex(h => h.toLowerCase() === 'description');
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
      
      const stripMd = (val: string) => 
        val.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1').replace(/[`*~]/g, '').trim();
      
      rules.push({
        name: ruleName,
        description: descIdx !== -1 ? cells[descIdx] || '' : '',
        recommended: row.includes('💼'),
        warns: row.includes('⚠️'),
        fixable: row.includes('🔧'),
        hasSuggestions: row.includes('💡'),
        deprecated: row.includes('🚫'),
        cwe: cweIdx !== -1 ? stripMd(cells[cweIdx] || '') : undefined,
        owasp: owaspIdx !== -1 ? stripMd(cells[owaspIdx] || '') : undefined,
        href: `/docs/quality/plugin-${plugin}/rules/${ruleName}`,
      });
    }
  }
  
  return rules;
}

export async function RulesTable({ plugin, limit, compact }: RulesTableProps) {
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
              {!compact && <th className="text-left py-2 px-3 font-medium">Description</th>}
              <th className="text-center py-2 px-3 font-medium w-16">💼</th>
              <th className="text-center py-2 px-3 font-medium w-16">🔧</th>
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
                </td>
                {!compact && (
                  <td className="py-2 px-3 text-fd-muted-foreground">
                    {rule.description}
                  </td>
                )}
                <td className="text-center py-2 px-3">
                  {rule.recommended && <Briefcase className="h-4 w-4 text-fd-primary mx-auto" />}
                </td>
                <td className="text-center py-2 px-3">
                  {rule.fixable && <Wrench className="h-4 w-4 text-green-500 mx-auto" />}
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

/**
 * RulesTable - Fetches and displays plugin rules from README.md
 * 
 * Parses the rules table from README and renders with links to individual rule docs.
 * Uses the same parsing logic as the archive's ReadmeRulesTable.
 */

import Link from 'next/link';
import { Briefcase, Wrench, Lightbulb, AlertTriangle, Brain, ExternalLink } from 'lucide-react';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/ofri-peretz/eslint/main/packages';

// Security plugins that should link to /docs/security/
const SECURITY_PLUGINS = new Set([
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
]);

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

type TypeAwareness = 'unaware' | 'optional' | 'aware';

interface ParsedRule {
  name: string;
  description: string;
  recommended: boolean;
  fixable: boolean;
  hasSuggestions: boolean;
  warns: boolean;
  deprecated: boolean;
  /**
   * Whether the rule needs the TypeScript program. Sourced from the 🧠 column
   * in the README rules table — 🟢 unaware, 🟡 type-aware (refining),
   * 🟠 type-aware (graceful). Plays to {@link .agent/type-awareness-philosophy.md}.
   */
  typeAwareness: TypeAwareness;
  cwe?: string;
  owasp?: string;
  href: string;
}

/**
 * Determine the category path for a plugin
 */
function getPluginCategory(plugin: string): 'security' | 'quality' {
  return SECURITY_PLUGINS.has(plugin) ? 'security' : 'quality';
}

/**
 * In non-production environments, prefer the on-disk README so local edits to
 * `packages/eslint-plugin-<slug>/README.md` are visible at `npm run dev`
 * without having to push to `main` and wait for the ISR cache to expire.
 * Production fetches from the GitHub raw CDN, same as before.
 */
async function readLocalReadme(packageName: string): Promise<string | null> {
  if (process.env.NODE_ENV === 'production') return null;
  try {
    // Avoid bundling `node:fs/path` into client-only modules — guarded by env.
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    // Walk up from cwd looking for a packages/<name>/README.md. The dev server
    // runs from `apps/docs/`, so the monorepo root is two levels up.
    const candidates = [
      path.resolve(process.cwd(), '..', '..', 'packages', packageName, 'README.md'),
      path.resolve(process.cwd(), 'packages', packageName, 'README.md'),
    ];
    for (const p of candidates) {
      try {
        // Read directly and catch ENOENT/EISDIR rather than `stat()` + `readFile()`:
        // any check-then-use sequence is a TOCTOU race the file could lose
        // between the two calls (CodeQL: "Potential file system race condition").
        return await fs.readFile(p, 'utf-8');
      } catch {}
    }
  } catch {}
  return null;
}

/**
 * Fetch README and parse rules table
 */
async function fetchRules(plugin: string): Promise<ParsedRule[]> {
  const packageName = `eslint-plugin-${plugin}`;
  const url = `${GITHUB_RAW_BASE}/${packageName}/README.md`;
  const category = getPluginCategory(plugin);

  try {
    let markdown = await readLocalReadme(packageName);
    if (markdown === null) {
      const res = await fetch(url, {
        // 12-hour TTL — standardized across blog + docs 2026-05-23
        next: { revalidate: 43200 },
      });

      if (!res.ok) {
        console.error(`[RulesTable] Failed to fetch ${plugin}: ${res.status}`);
        return [];
      }

      markdown = await res.text();
    }

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
// Rule slug allow-list: lowercase alphanumeric + dashes. The values flow from
// markdown READMEs (file data) into the fetch URL below — CodeQL flagged this
// as "File data in outbound network request". Constraining the shape here
// prevents any future README change from injecting a path-traversal segment
// or arbitrary host into the constructed URL.
const VALID_RULE_NAME = /^[a-z0-9][a-z0-9-]*$/;

async function fetchRuleDescriptions(plugin: string, rules: ParsedRule[]): Promise<ParsedRule[]> {
  const packageName = `eslint-plugin-${plugin}`;

  const fetchPromises = rules.map(async (rule) => {
    if (!VALID_RULE_NAME.test(rule.name)) {
      return rule;
    }
    try {
      const ruleDocUrl = `${GITHUB_RAW_BASE}/${packageName}/docs/rules/${rule.name}.md`;
      const res = await fetch(ruleDocUrl, {
        // 12-hour TTL — standardized across blog + docs 2026-05-23
        next: { revalidate: 43200 },
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
    // The 🧠 column header is a single brain emoji; identify by exact match.
    const typeIdx = headerCells.findIndex(h => h.trim() === '🧠');

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

      const typeCell = typeIdx !== -1 ? cells[typeIdx] : '';
      const typeAwareness: TypeAwareness = typeCell.includes('🟡')
        ? 'optional'
        : typeCell.includes('🟠')
          ? 'aware'
          : 'unaware';

      rules.push({
        name: ruleName,
        description: '', // Will be filled by fetchRuleDescriptions
        recommended: row.includes('💼'),
        warns: row.includes('⚠️'),
        fixable: row.includes('🔧'),
        hasSuggestions: row.includes('💡'),
        deprecated: row.includes('🚫'),
        typeAwareness,
        cwe: cweIdx !== -1 ? stripMarkdown(cells[cweIdx] || '') : undefined,
        owasp: owaspIdx !== -1 ? stripMarkdown(cells[owaspIdx] || '') : undefined,
        href: `/docs/${category}/plugin-${plugin}/rules/${ruleName}`,
      });
    }
  }
  
  return rules;
}

export async function RulesTable({ plugin, limit, compact: _compact, showLinks: _showLinks }: RulesTableProps) {
  const rules = await fetchRules(plugin);
  const displayRules = limit ? rules.slice(0, limit) : rules;
  
  if (rules.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Unable to parse rules from README. Please check the{' '}
          <a
            data-testid="rules-table-fallback-link"
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
          <Brain className="h-3.5 w-3.5 text-emerald-500" />
          <span aria-hidden>🟢</span> Type-unaware
        </span>
        <span className="flex items-center gap-1">
          <Brain className="h-3.5 w-3.5 text-amber-500" />
          <span aria-hidden>🟡/🟠</span> Type-aware
        </span>
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
              <th className="text-center py-2 px-3 font-medium w-14" title="Type-awareness">🧠</th>
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
                <td
                  className="text-center py-2 px-3"
                  data-type-awareness={rule.typeAwareness}
                  title={
                    rule.typeAwareness === 'unaware'
                      ? 'Type-unaware (AST-only)'
                      : rule.typeAwareness === 'optional'
                        ? 'Type-aware (refining): pure-AST primary path; types refine precision'
                        : 'Type-aware (graceful): requires TypeScript program'
                  }
                >
                  {rule.typeAwareness === 'unaware' ? (
                    <span aria-label="Type-unaware">🟢</span>
                  ) : rule.typeAwareness === 'optional' ? (
                    <span aria-label="Type-aware (refining)">🟡</span>
                  ) : (
                    <span aria-label="Type-aware (graceful)">🟠</span>
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

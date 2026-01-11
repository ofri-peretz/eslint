'use client';

import React from 'react';
import Link from 'next/link';
import { Wrench, Lightbulb, Briefcase, ExternalLink } from 'lucide-react';

interface Rule {
  name: string;
  cwe?: string;
  owasp?: string;
  description?: string;
  recommended?: boolean;
  fixable?: boolean;
  hasSuggestions?: boolean;
  href: string;
}

interface PluginRulesData {
  plugin: string;
  package: string;
  rules: Rule[];
  totalRules: number;
  lastSynced: string;
}

interface ReadmeRulesTableProps {
  plugin: string;
  limit?: number;
  compact?: boolean;
}

// Helper to generate CWE link
function getCweLink(cwe: string): string {
  const match = cwe.match(/CWE-(\d+)/i);
  if (match) {
    return `https://cwe.mitre.org/data/definitions/${match[1]}.html`;
  }
  return `https://cwe.mitre.org/data/definitions/${cwe.replace(/\D/g, '')}.html`;
}

// Helper to generate OWASP link
function getOwaspLink(owasp: string): string {
  // Handle formats like "A03", "A03:2021", "A01:2021", etc.
  const match = owasp.match(/A(\d+)/i);
  if (match) {
    return `https://owasp.org/Top10/A${match[1].padStart(2, '0')}_2021/`;
  }
  return 'https://owasp.org/www-project-top-ten/';
}

/**
 * Icon Legend component
 */
function IconLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-fd-muted-foreground mb-4 pb-3 border-b border-fd-border">
      <span className="flex items-center gap-1.5">
        <Briefcase className="h-3.5 w-3.5 text-fd-primary" />
        <span>Recommended</span>
      </span>
      <span className="flex items-center gap-1.5">
        <Wrench className="h-3.5 w-3.5 text-emerald-500" />
        <span>Auto-fixable</span>
      </span>
      <span className="flex items-center gap-1.5">
        <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
        <span>Has suggestions</span>
      </span>
    </div>
  );
}

export function ReadmeRulesTable({ plugin, limit, compact = false }: ReadmeRulesTableProps) {
  const [data, setData] = React.useState<PluginRulesData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadRules() {
      try {
        const response = await import(`@/data/plugin-rules/${plugin}.json`);
        setData(response.default || response);
      } catch (err) {
        console.error(`Failed to load rules for ${plugin}:`, err);
        setError(`Rules data not available for ${plugin}`);
      } finally {
        setIsLoading(false);
      }
    }
    loadRules();
  }, [plugin]);

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-lg border bg-fd-muted/50 p-8 text-center">
        <p className="text-fd-muted-foreground">Loading rules...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
        <p className="text-amber-800 dark:text-amber-200">
          {error || 'Unable to load rules data'}
        </p>
      </div>
    );
  }

  const displayRules = limit ? data.rules.slice(0, limit) : data.rules;

  if (compact) {
    return (
      <div className="rules-table-compact">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-fd-muted-foreground">
            {data.totalRules} rules
          </span>
        </div>
        <ul className="space-y-1">
          {displayRules.map((rule) => (
            <li key={rule.name} className="flex items-center gap-2">
              <Link
                href={rule.href}
                className="text-fd-primary hover:underline"
              >
                <code className="text-sm bg-fd-muted px-1.5 py-0.5 rounded">{rule.name}</code>
              </Link>
              {rule.recommended && (
                <Briefcase className="h-3.5 w-3.5 text-fd-primary" title="Recommended" />
              )}
              {rule.fixable && (
                <Wrench className="h-3.5 w-3.5 text-emerald-500" title="Auto-fixable" />
              )}
              {rule.hasSuggestions && (
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" title="Has suggestions" />
              )}
            </li>
          ))}
        </ul>
        {limit && data.rules.length > limit && (
          <Link
            href={`/docs/${plugin}/rules`}
            className="mt-3 inline-block text-sm text-fd-primary hover:underline"
          >
            View all {data.totalRules} rules →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="rules-table-full">
      <IconLegend />
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-fd-border">
              <th className="text-left py-2 pr-4 font-medium">Rule</th>
              <th className="text-center px-2 py-2 font-medium">CWE</th>
              <th className="text-center px-2 py-2 font-medium">OWASP</th>
              <th className="text-left px-2 py-2 font-medium">Description</th>
              <th className="text-center px-1 py-2 w-8" title="Recommended">💼</th>
              <th className="text-center px-1 py-2 w-8" title="Auto-fixable">🔧</th>
              <th className="text-center px-1 py-2 w-8" title="Has suggestions">💡</th>
            </tr>
          </thead>
          <tbody>
            {displayRules.map((rule) => (
              <tr key={rule.name} className="border-b border-fd-border/50 hover:bg-fd-muted/30">
                <td className="py-2.5 pr-4">
                  <Link
                    href={rule.href}
                    className="text-fd-primary hover:underline"
                  >
                    <code className="bg-fd-muted px-1.5 py-0.5 rounded text-xs">{rule.name}</code>
                  </Link>
                </td>
                <td className="text-center px-2 py-2.5">
                  {rule.cwe && (
                    <a
                      href={getCweLink(rule.cwe)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-fd-muted-foreground hover:text-fd-primary transition-colors"
                      title={`View ${rule.cwe} on MITRE`}
                    >
                      {rule.cwe}
                      <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                    </a>
                  )}
                </td>
                <td className="text-center px-2 py-2.5">
                  {rule.owasp && (
                    <a
                      href={getOwaspLink(rule.owasp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-fd-muted-foreground hover:text-fd-primary transition-colors"
                      title={`View ${rule.owasp} on OWASP`}
                    >
                      {rule.owasp}
                      <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                    </a>
                  )}
                </td>
                <td className="text-fd-muted-foreground px-2 py-2.5">
                  {rule.description}
                </td>
                <td className="text-center px-1 py-2.5">
                  {rule.recommended && (
                    <Briefcase className="mx-auto h-4 w-4 text-fd-primary" />
                  )}
                </td>
                <td className="text-center px-1 py-2.5">
                  {rule.fixable && (
                    <Wrench className="mx-auto h-4 w-4 text-emerald-500" />
                  )}
                </td>
                <td className="text-center px-1 py-2.5">
                  {rule.hasSuggestions && (
                    <Lightbulb className="mx-auto h-4 w-4 text-amber-500" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {limit && data.rules.length > limit && (
        <div className="mt-4 text-center">
          <Link
            href={`/docs/${plugin}/rules`}
            className="text-sm text-fd-primary hover:underline"
          >
            View all {data.totalRules} rules →
          </Link>
        </div>
      )}
    </div>
  );
}


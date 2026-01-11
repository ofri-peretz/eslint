import { getReadmeWithFallback, type ParsedReadme, type ParsedRule } from '@/lib/readme';
import Link from 'next/link';
import { Wrench, Lightbulb, CheckCircle, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ReadmeContentProps {
  /**
   * Plugin slug (e.g., "browser-security")
   */
  plugin: string;
  /**
   * Show introduction section
   */
  showIntro?: boolean;
  /**
   * Show rules table
   */
  showRules?: boolean;
  /**
   * Limit number of rules shown (shows "View all" link if limited)
   */
  rulesLimit?: number;
}

/**
 * Server Component that fetches and renders README content from GitHub
 * Uses ISR caching with webhook-based cache invalidation
 */
export async function ReadmeContent({
  plugin,
  showIntro = true,
  showRules = true,
  rulesLimit,
}: ReadmeContentProps) {
  const readme = await getReadmeWithFallback(plugin);

  if (!readme) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
        <p className="text-amber-800 dark:text-amber-200">
          Unable to load plugin content. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="readme-content space-y-6">
      {showIntro && readme.introduction && (
        <IntroductionSection intro={readme.introduction} />
      )}
      
      {showRules && readme.rules.length > 0 && (
        <RulesTableSection 
          rules={readme.rules} 
          plugin={plugin}
          limit={rulesLimit}
        />
      )}
    </div>
  );
}

function IntroductionSection({ intro }: { intro: string }) {
  return (
    <p className="text-lg text-fd-muted-foreground leading-relaxed">
      {intro}
    </p>
  );
}

interface RulesTableSectionProps {
  rules: ParsedRule[];
  plugin: string;
  limit?: number;
}

function RulesTableSection({ rules, plugin, limit }: RulesTableSectionProps) {
  const displayRules = limit ? rules.slice(0, limit) : rules;
  const hasMore = limit && rules.length > limit;

  return (
    <div className="rules-table-section">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Rules ({rules.length})
        </h3>
        <Link
          href={`/docs/${plugin}/rules`}
          className="text-sm text-fd-primary hover:underline inline-flex items-center gap-1"
        >
          View all rules
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">Rule</th>
              <th className="text-center">CWE</th>
              <th className="text-center">OWASP</th>
              <th className="text-left">Description</th>
              <th className="text-center" title="Recommended">💼</th>
              <th className="text-center" title="Auto-fixable">🔧</th>
              <th className="text-center" title="Has suggestions">💡</th>
            </tr>
          </thead>
          <tbody>
            {displayRules.map((rule) => (
              <tr key={rule.name}>
                <td>
                  <Link
                    href={rule.href}
                    className="font-medium text-fd-primary hover:underline"
                  >
                    {rule.name}
                  </Link>
                </td>
                <td className="text-center">
                  {rule.cwe && (
                    <Badge variant="outline" className="text-xs">
                      {rule.cwe}
                    </Badge>
                  )}
                </td>
                <td className="text-center">
                  {rule.owasp && (
                    <Badge variant="outline" className="text-xs">
                      {rule.owasp}
                    </Badge>
                  )}
                </td>
                <td className="text-fd-muted-foreground text-sm">
                  {rule.description}
                </td>
                <td className="text-center">
                  {rule.recommended && (
                    <CheckCircle className="mx-auto h-4 w-4 text-fd-primary" />
                  )}
                </td>
                <td className="text-center">
                  {rule.fixable && (
                    <Wrench className="mx-auto h-4 w-4 text-emerald-500" />
                  )}
                </td>
                <td className="text-center">
                  {rule.hasSuggestions && (
                    <Lightbulb className="mx-auto h-4 w-4 text-amber-500" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {hasMore && (
        <div className="mt-4 text-center">
          <Link
            href={`/docs/${plugin}/rules`}
            className="text-sm text-fd-primary hover:underline"
          >
            View all {rules.length} rules →
          </Link>
        </div>
      )}
    </div>
  );
}

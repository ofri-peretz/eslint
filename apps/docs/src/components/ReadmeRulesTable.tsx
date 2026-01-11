'use client';

import React from 'react';
import Link from 'next/link';
import { Wrench, Lightbulb, Briefcase, ExternalLink, ShieldAlert, Ban, HelpCircle } from 'lucide-react';
import CWE_NAMES_DATA from '@/data/cwe-names.json';
import CWE_STATS_DATA from '@/data/cwe-stats.json';
import { CvssDisclaimer } from '@/components/CvssDisclaimer';

interface CweStatsEntry {
  mean_cvss: number;
  max_cvss: number;
  cve_count: number;
  top_cves: string[];
}

const CWE_STATS: Record<string, CweStatsEntry> = CWE_STATS_DATA;

interface Rule {
  name: string;
  cwe?: string;
  owasp?: string;
  cve?: string;
  cvss?: string;
  description?: string;
  recommended?: boolean;
  warns?: boolean;
  fixable?: boolean;
  hasSuggestions?: boolean;
  deprecated?: boolean;
  category?: string;
  href: string;
}

interface PluginRulesData {
  plugin: string;
  package: string;
  type?: 'security' | 'architecture';
  rules: Rule[];
  totalRules: number;
  lastSynced: string;
}

interface ReadmeRulesTableProps {
  plugin: string;
  limit?: number;
  compact?: boolean;
}

const CWE_NAMES: Record<string, string> = CWE_NAMES_DATA;


// Helper to generate CWE link
function getCweLink(cwe: string): string {
  // Strip any non-numeric characters to get the ID
  const id = cwe.replace(/\D/g, '');
  if (id) {
    return `https://cwe.mitre.org/data/definitions/${id}.html`;
  }
  return 'https://cwe.mitre.org/data/index.html';
}

// Helper to get CWE name
function getCweName(cwe: string): string | undefined {
  const id = cwe.replace(/\D/g, '');
  return CWE_NAMES[id];
}

// OWASP Web Top 10 2021 mappings with verified URLs and names
const OWASP_WEB_TOP_10: Record<string, { slug: string; name: string }> = {
  '01': { slug: 'A01_2021-Broken_Access_Control', name: 'Broken Access Control' },
  '02': { slug: 'A02_2021-Cryptographic_Failures', name: 'Cryptographic Failures' },
  '03': { slug: 'A03_2021-Injection', name: 'Injection' },
  '04': { slug: 'A04_2021-Insecure_Design', name: 'Insecure Design' },
  '05': { slug: 'A05_2021-Security_Misconfiguration', name: 'Security Misconfiguration' },
  '06': { slug: 'A06_2021-Vulnerable_and_Outdated_Components', name: 'Vulnerable and Outdated Components' },
  '07': { slug: 'A07_2021-Identification_and_Authentication_Failures', name: 'Identification and Authentication Failures' },
  '08': { slug: 'A08_2021-Software_and_Data_Integrity_Failures', name: 'Software and Data Integrity Failures' },
  '09': { slug: 'A09_2021-Security_Logging_and_Monitoring_Failures', name: 'Security Logging and Monitoring Failures' },
  '10': { slug: 'A10_2021-Server-Side_Request_Forgery_%28SSRF%29', name: 'Server-Side Request Forgery (SSRF)' },
};

// OWASP Mobile Top 10 2024 mappings with verified URLs and names
const OWASP_MOBILE_TOP_10: Record<string, { slug: string; name: string }> = {
  '01': { slug: 'm1-improper-credential-usage', name: 'Improper Credential Usage' },
  '02': { slug: 'm2-inadequate-supply-chain-security', name: 'Inadequate Supply Chain Security' },
  '03': { slug: 'm3-insecure-authentication-authorization', name: 'Insecure Authentication/Authorization' },
  '04': { slug: 'm4-insufficient-input-output-validation', name: 'Insufficient Input/Output Validation' },
  '05': { slug: 'm5-insecure-communication', name: 'Insecure Communication' },
  '06': { slug: 'm6-inadequate-privacy-controls', name: 'Inadequate Privacy Controls' },
  '07': { slug: 'm7-insufficient-binary-protection', name: 'Insufficient Binary Protections' },
  '08': { slug: 'm8-security-misconfiguration', name: 'Security Misconfiguration' },
  '09': { slug: 'm9-insecure-data-storage', name: 'Insecure Data Storage' },
  '10': { slug: 'm10-insufficient-cryptography', name: 'Insufficient Cryptography' },
};

// OWASP Serverless Architectures Security (SAS) Top 10 mappings
// Source: https://github.com/puresec/sas-top-10
const OWASP_SERVERLESS_TOP_10: Record<string, { anchor: string; name: string }> = {
  '1': { anchor: 'sas-1-function-event-data-injection', name: 'Function Event Data Injection' },
  '2': { anchor: 'sas-2-broken-authentication', name: 'Broken Authentication' },
  '3': { anchor: 'sas-3-insecure-serverless-deployment-configuration', name: 'Insecure Serverless Deployment Configuration' },
  '4': { anchor: 'sas-4-over-privileged-function-permissions-and-roles', name: 'Over-Privileged Function Permissions & Roles' },
  '5': { anchor: 'sas-5-inadequate-function-monitoring-and-logging', name: 'Inadequate Function Monitoring and Logging' },
  '6': { anchor: 'sas-6-insecure-3rd-party-dependencies', name: 'Insecure 3rd Party Dependencies' },
  '7': { anchor: 'sas-7-insecure-application-secrets-storage', name: 'Insecure Application Secrets Storage' },
  '8': { anchor: 'sas-8-denial-of-service-and-financial-resource-exhaustion', name: 'Denial of Service & Financial Resource Exhaustion' },
  '9': { anchor: 'sas-9-serverless-function-execution-flow-manipulation', name: 'Serverless Function Execution Flow Manipulation' },
  '10': { anchor: 'sas-10-improper-exception-handling-and-verbose-error-messages', name: 'Improper Exception Handling and Verbose Error Messages' },
};

// Helper to generate OWASP link
function getOwaspLink(owasp: string): string {
  // Handle SAS format first: "SAS-1", "SAS-2", etc.
  const sasMatch = owasp.match(/SAS-?(\d+)/i);
  if (sasMatch) {
    const id = sasMatch[1];
    const entry = OWASP_SERVERLESS_TOP_10[id];
    if (entry) {
      return `https://github.com/puresec/sas-top-10#${entry.anchor}`;
    }
  }

  // Handle formats like "A03", "A03:2021", "M5", etc.
  const match = owasp.match(/([AM])(\d+)/i);
  if (match) {
    const prefix = match[1].toUpperCase();
    const id = match[2].padStart(2, '0');
    if (prefix === 'A') {
      const entry = OWASP_WEB_TOP_10[id];
      if (entry) {
        return `https://owasp.org/Top10/2021/${entry.slug}/`;
      }
    } else if (prefix === 'M') {
      const entry = OWASP_MOBILE_TOP_10[id];
      if (entry) {
        return `https://owasp.org/www-project-mobile-top-10/2023-risks/${entry.slug}.html`;
      }
    }
  }
  // Fallback to OWASP Cheat Sheet Series index for unknown entries
  return 'https://cheatsheetseries.owasp.org/index.html';
}

// Helper to get OWASP category name for tooltips
function getOwaspName(owasp: string): string | undefined {
  // Handle SAS format first
  const sasMatch = owasp.match(/SAS-?(\d+)/i);
  if (sasMatch) {
    const id = sasMatch[1];
    return OWASP_SERVERLESS_TOP_10[id]?.name;
  }

  const match = owasp.match(/([AM])(\d+)/i);
  if (match) {
    const prefix = match[1].toUpperCase();
    const id = match[2].padStart(2, '0');
    if (prefix === 'A') {
      return OWASP_WEB_TOP_10[id]?.name;
    } else if (prefix === 'M') {
      return OWASP_MOBILE_TOP_10[id]?.name;
    }
  }
  return undefined;
}

// Helper to render description with inline code formatting
function renderDescription(description: string): React.ReactNode {
  // Split by backtick-wrapped content and render code elements
  const parts = description.split(/(`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      const code = part.slice(1, -1);
      return (
        <code 
          key={index}
          className="bg-fd-muted px-1 py-0.5 rounded text-[11px] font-mono border border-fd-border/50"
        >
          {code}
        </code>
      );
    }
    return part;
  });
}

/**
 * Icon Legend component with detailed tooltips
 */
function IconLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-fd-muted-foreground mb-4 pb-3 border-b border-fd-border items-center">
      <span className="font-medium mr-1 flex items-center gap-1">
        Legend <HelpCircle className="h-3 w-3 opacity-50" />:
      </span>
      <span 
        className="flex items-center gap-1.5 cursor-help hover:text-fd-foreground transition-colors" 
        title="Recommended (💼): Included in the plugin's recommended preset. These rules catch common security issues with low false-positive rates."
      >
        <Briefcase className="h-3.5 w-3.5 text-fd-primary" />
        <span>Recommended</span>
      </span>
      <span 
        className="flex items-center gap-1.5 cursor-help hover:text-fd-foreground transition-colors"
        title="Warns (⚠️): Set to 'warn' in the recommended preset. These rules identify potential issues that require manual review."
      >
        <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
        <span>Warns</span>
      </span>
      <span 
        className="flex items-center gap-1.5 cursor-help hover:text-fd-foreground transition-colors"
        title="Auto-fixable (🔧): ESLint can automatically fix violations of this rule using --fix. The fix is always safe and maintains code semantics."
      >
        <Wrench className="h-3.5 w-3.5 text-emerald-500" />
        <span>Auto-fixable</span>
      </span>
      <span 
        className="flex items-center gap-1.5 cursor-help hover:text-fd-foreground transition-colors"
        title="Has Suggestions (💡): The rule provides code suggestions that can be applied via your IDE. Suggestions may require code architectural review."
      >
        <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
        <span>Suggestions</span>
      </span>
      <span 
        className="flex items-center gap-1.5 cursor-help hover:text-fd-foreground transition-colors"
        title="Deprecated (🚫): This rule is legacy and has been replaced by more modern security rules or dedicated plugins."
      >
        <Ban className="h-3.5 w-3.5 text-fd-muted-foreground opacity-50" />
        <span>Deprecated</span>
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
  const isSecurityPlugin = !data.type || data.type === 'security';

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
                <span title="Recommended"><Briefcase className="h-3.5 w-3.5 text-fd-primary" /></span>
              )}
              {rule.fixable && (
                <span title="Auto-fixable"><Wrench className="h-3.5 w-3.5 text-emerald-500" /></span>
              )}
              {rule.hasSuggestions && (
                <span title="Has suggestions"><Lightbulb className="h-3.5 w-3.5 text-amber-500" /></span>
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
        <table className="w-full min-w-[1000px] text-sm border-collapse table-fixed">
          <thead>
            <tr className="border-b border-fd-border bg-fd-muted/20">
              <th className="text-left py-2.5 pr-4 font-semibold w-[220px]">Rule</th>
              {isSecurityPlugin ? (
                <>
                  <th className="text-center px-2 py-2.5 font-semibold w-[100px]">CWE / CVE</th>
                  <th className="text-center px-2 py-2.5 font-semibold w-[110px]">OWASP</th>
                  <th className="text-center px-2 py-2.5 font-semibold w-[70px]">CVSS<span className="text-fd-primary">*</span></th>
                </>
              ) : (
                <th className="text-left px-2 py-2.5 font-semibold w-[200px]">Category</th>
              )}
              <th className="text-left px-2 py-2.5 font-semibold">Description</th>
              <th className="text-center px-1 py-2.5 w-8" title="Recommended">
                <Briefcase className="w-4 h-4 mx-auto text-fd-muted-foreground" />
              </th>
              <th className="text-center px-1 py-2.5 w-8" title="Warns">
                <ShieldAlert className="w-4 h-4 mx-auto text-fd-muted-foreground" />
              </th>
              <th className="text-center px-1 py-2.5 w-8" title="Auto-fixable">
                <Wrench className="w-4 h-4 mx-auto text-fd-muted-foreground" />
              </th>
              <th className="text-center px-1 py-2.5 w-8" title="Has suggestions">
                <Lightbulb className="w-4 h-4 mx-auto text-fd-muted-foreground" />
              </th>
              <th className="text-center px-1 py-2.5 w-8" title="Deprecated">
                <Ban className="w-4 h-4 mx-auto text-fd-muted-foreground" />
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRules.map((rule) => {
              const ruleSlug = rule.name.replace(/[`*~]/g, '');
              return (
                <tr key={rule.name} className="border-b border-fd-border/50 hover:bg-fd-muted/30 transition-colors">
                  <td className="py-3 pr-4 align-middle">
                    <Link
                      href={rule.href}
                      className="text-fd-primary hover:underline group"
                    >
                      <code className="bg-fd-muted group-hover:bg-fd-accent px-1.5 py-0.5 rounded text-xs font-mono border border-fd-border/50 transition-colors break-all">
                        {ruleSlug}
                      </code>
                    </Link>
                  </td>
                  {isSecurityPlugin ? (
                    <>
                      <td className="text-center px-2 py-3 align-middle">
                        <div className="flex flex-col items-center gap-2">
                        {rule.cwe && (
                          <div className="flex flex-col items-center group/cwe cursor-help relative">
                            <a
                              href={getCweLink(rule.cwe)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-fd-primary hover:underline"
                              title={`View ${rule.cwe} on MITRE`}
                            >
                              {rule.cwe.replace(/CWE-/i, '')}
                              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                            </a>
                            
                            {/* Global Avg Indicator */}
                            {CWE_STATS[rule.cwe] && (
                              <div className="mt-1 flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-fd-muted border border-fd-border/50 text-[9px] font-bold text-fd-muted-foreground whitespace-nowrap">
                                <span className="opacity-50 uppercase">Global Avg:</span>
                                <span className={
                                  CWE_STATS[rule.cwe].mean_cvss >= 9.0 ? 'text-red-500' :
                                  CWE_STATS[rule.cwe].mean_cvss >= 7.0 ? 'text-orange-500' :
                                  'text-amber-500'
                                }>
                                  {CWE_STATS[rule.cwe].mean_cvss}
                                </span>
                              </div>
                            )}

                            {getCweName(rule.cwe) && (
                              <span className="text-[10px] text-fd-muted-foreground opacity-80 mt-1 leading-tight text-center">
                                {getCweName(rule.cwe)}
                              </span>
                            )}

                            {/* Hover Details */}
                            {CWE_STATS[rule.cwe] && (
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/cwe:block z-50 w-48 p-2 rounded-lg border bg-fd-popover shadow-lg text-[10px] balance-text">
                                <div className="font-bold border-b border-fd-border pb-1 mb-1">CWE Risk Analysis</div>
                                <div className="flex justify-between">
                                  <span>Industry Avg:</span>
                                  <span className="font-bold text-fd-primary">{CWE_STATS[rule.cwe].mean_cvss}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Max Severity:</span>
                                  <span className="text-red-500 font-medium">{CWE_STATS[rule.cwe].max_cvss}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Total CVEs:</span>
                                  <span>{CWE_STATS[rule.cwe].cve_count.toLocaleString()}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {rule.cve && (
                          <a
                            href={`https://nvd.nist.gov/vuln/detail/${rule.cve}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-500/5 px-1 py-0.5 rounded border border-orange-500/10 hover:bg-orange-500/10 transition-colors"
                            title={`View ${rule.cve} on NVD`}
                          >
                            {rule.cve}
                            <ExternalLink className="h-2 w-2 opacity-60" />
                          </a>
                        )}
                        </div>
                      </td>
                      <td className="text-center px-2 py-3 align-middle">
                        {rule.owasp && (
                          <div className="flex flex-col items-center">
                            <a
                              href={getOwaspLink(rule.owasp)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-fd-primary hover:underline"
                              title={`View ${rule.owasp} on OWASP`}
                            >
                              {rule.owasp}
                              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                            </a>
                            {getOwaspName(rule.owasp) && (
                              <span className="text-[10px] text-fd-muted-foreground opacity-80 mt-0.5 leading-tight">
                                {getOwaspName(rule.owasp)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="text-center px-2 py-3 align-middle">
                        {rule.cvss && (
                          <a
                            href="https://www.first.org/cvss/v3.1/specification-document"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block hover:scale-110 transition-transform"
                            title="CVSS v3.1 Base Score Reference"
                          >
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                              parseFloat(rule.cvss) >= 9.0 ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                              parseFloat(rule.cvss) >= 7.0 ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                              'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            }`}>
                              {rule.cvss}
                            </span>
                          </a>
                        )}
                      </td>
                    </>
                  ) : (
                    <td className="text-left px-2 py-3 align-middle">
                      {rule.category && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-fd-primary/10 text-fd-primary border border-fd-primary/20 whitespace-nowrap">
                          {rule.category}
                        </span>
                      )}
                    </td>
                  )}
                  <td className="text-fd-muted-foreground px-2 py-3 leading-relaxed align-middle">
                    {rule.description && renderDescription(rule.description)}
                  </td>
                  <td className="px-1 py-3 align-middle">
                    <div className="flex items-center justify-center">
                      {rule.recommended && (
                        <Briefcase className="h-4 w-4 text-fd-primary" />
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-3 align-middle">
                    <div className="flex items-center justify-center">
                      {rule.warns && (
                        <ShieldAlert className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-3 align-middle">
                    <div className="flex items-center justify-center">
                      {rule.fixable && (
                        <Wrench className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-3 align-middle">
                    <div className="flex items-center justify-center">
                      {rule.hasSuggestions && (
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-3 align-middle">
                    <div className="flex items-center justify-center">
                      {rule.deprecated && (
                        <Ban className="h-4 w-4 text-fd-muted-foreground opacity-30" />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {isSecurityPlugin && <CvssDisclaimer className="mt-3" />}

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


/**
 * Search and answer-engine metadata for docs pages: titles, descriptions,
 * modification dates and schema.org JSON-LD.
 *
 * Pure functions over the synced rules manifest and the git-derived date
 * manifest, so a lock test can check all 499 rule pages without a build.
 *
 * Why it exists (audit 2026-11-19, 621 pages crawled):
 *   - rule pages were titled with the bare slug ("no-unsafe-query | ESLint
 *     Interlace" nine times over, one per database plugin);
 *   - 17 rule pages shared the description "The rule provides LLM-optimized
 *     error messages…", others were just "CWE-319";
 *   - no page carried JSON-LD, and the sitemap had no `<lastmod>`.
 *
 * The title shape answers the query people type: `<rule>: <what it catches> |
 * <plugin>`. The description falls back to the rule's own
 * `meta.docs.description` (via the manifest) when the page's frontmatter is a
 * placeholder, and always names the rule ID and plugin, so no two pages share
 * one.
 */
import manifest from '@/data/rules-manifest.json';
import contentDates from '@/data/content-dates.json';
import { SITE_ORIGIN } from '@/lib/site-config';

/**
 * What each plugin page is about, in the words of the query that should land
 * on it. Keyed by plugin slug; the lock test fails if a plugin has no entry.
 */
export const PLUGIN_SEARCH_TITLES: Record<string, string> = {
  'anthropic-security': 'Anthropic SDK API key leaks and prompt injection',
  'browser-security': 'detect XSS, postMessage and cookie leaks in the browser',
  conventions: 'team conventions, TODO expiry and commented-out code',
  'drizzle-security': 'SQL injection in Drizzle sql.raw() queries',
  'express-security': 'Express CORS, CSRF, cookie and Helmet checks',
  'gemini-security': 'Gemini SDK API key leaks and prompt injection',
  'import-next': 'drop-in eslint-plugin-import replacement for flat config',
  'jwt-security': 'JWT verification, alg none and weak secret checks',
  'knex-security': 'SQL injection in knex.raw() queries',
  'lambda-security': 'AWS Lambda and Middy handler security',
  maintainability: 'cognitive complexity, silent errors and readability',
  'mcp-sdk-security': 'MCP server security: tool input, injection and SSRF',
  modernization: 'modernize JavaScript to ES2022+ syntax',
  modularity: 'module boundaries, DDD and REST naming rules',
  'mongodb-security': 'NoSQL injection in MongoDB and Mongoose',
  'mysql-security': 'SQL injection in mysql and mysql2 queries',
  'nestjs-security': 'NestJS guards, validation pipes and throttling',
  'node-security': 'Node.js child_process, fs, vm and crypto security',
  'openai-security': 'OpenAI SDK API key leaks and prompt injection',
  operability: 'console.log, debug code and process.exit in production',
  'postgresql-security': 'SQL injection and pool leaks in node-postgres (pg)',
  'prisma-security': 'SQL injection in Prisma raw queries',
  'react-a11y': 'React accessibility (JSX a11y) for WCAG',
  'react-features': 'React hooks, JSX and component best practices',
  reliability: 'unhandled promises, empty catch blocks and null checks',
  'secure-coding': 'OWASP Top 10 checks for JavaScript and TypeScript',
  'sequelize-security': 'SQL injection in raw Sequelize queries',
  'sqlite-security': 'SQL injection in SQLite statements',
  'grpc-security':
    'gRPC reflection, metadata identity, message size, error details',
  'supabase-security': 'Supabase service_role key, RPC and storage checks',
  'typeorm-security': 'SQL injection in TypeORM raw queries',
  'vercel-ai-security': 'Vercel AI SDK prompt injection and tool safety',
};

export const AUTHOR = {
  '@type': 'Person',
  name: 'Ofri Peretz',
  url: 'https://ofriperetz.dev',
} as const;

export const PUBLISHER = {
  '@type': 'Organization',
  name: 'Interlace',
  url: 'https://interlace.tools',
} as const;

export type DocsPageKind =
  | { kind: 'rule'; plugin: string; rule: string }
  | { kind: 'plugin'; plugin: string }
  | { kind: 'rules-index'; plugin: string }
  | { kind: 'changelog'; plugin: string }
  | { kind: 'other' };

/** Reads the page's role from its slug: `[...section, 'plugin-<x>', ...rest]`. */
export function classifyDocsSlugs(slugs: readonly string[]): DocsPageKind {
  const at = slugs.findIndex((s) => s.startsWith('plugin-'));
  if (at < 0) return { kind: 'other' };
  const plugin = slugs[at].slice('plugin-'.length);
  const rest = slugs.slice(at + 1);
  if (rest.length === 0) return { kind: 'plugin', plugin };
  if (rest[0] === 'rules' && rest.length === 1)
    return { kind: 'rules-index', plugin };
  if (rest[0] === 'rules' && rest.length === 2)
    return { kind: 'rule', plugin, rule: rest[1] };
  if (rest[0] === 'changelog' && rest.length === 1)
    return { kind: 'changelog', plugin };
  return { kind: 'other' };
}

export interface ManifestRule {
  prefix: string;
  rule: string;
  description: string;
  cwe: string | null;
}

const RULES = manifest.rules as ManifestRule[];

export function manifestRule(
  plugin: string,
  rule: string,
): ManifestRule | undefined {
  return RULES.find((r) => r.prefix === plugin && r.rule === rule);
}

export function pluginRuleCount(plugin: string): number {
  return RULES.filter((r) => r.prefix === plugin).length;
}

/**
 * A frontmatter description that says nothing about what the rule catches:
 * a sync placeholder, a bare CWE id, or the rule name echoed back.
 */
export function isPlaceholderDescription(
  description: string | undefined,
  rule: string,
): boolean {
  if (!description) return true;
  const d = description.trim();
  return (
    d.length < 12 ||
    /^CWE-\d+$/i.test(d) ||
    /LLM-optimized error messages/i.test(d) ||
    /^Security rule for /i.test(d) ||
    /^ESLint Rule:/i.test(d) ||
    d === `${rule} rule` ||
    /^Get weather$/i.test(d)
  );
}

const TRAILING_FILLER =
  /\s+(?:and|or|the|a|an|in|to|for|of|with|by|that|which|on|from|when|as|via|can|could|may|might|will|be|is|are)$/i;

/** First clause of a description, at most ~`max` chars, for a title. */
export function shortWhat(description: string, max = 60): string {
  let s = description
    .trim()
    .replace(/`/g, '')
    .replace(/[.:]+$/, '');
  s = s.split(/\s+\(|\s+[—–-]\s+|;\s|\.\s|,\s+which\s/)[0];
  if (s.length > max) {
    const cut = s.lastIndexOf(' ', max);
    s = s.slice(0, cut > 0 ? cut : max);
  }
  const trim = (t: string) => t.replace(/[\s,;:/-]+$/, '');
  s = trim(s);
  while (TRAILING_FILLER.test(s)) s = trim(s.replace(TRAILING_FILLER, ''));
  // Lower-case the leading verb, but not an acronym ("XSS", "JWT", "SQL").
  if (/^[A-Z][a-z]/.test(s)) s = s[0].toLowerCase() + s.slice(1);
  return s;
}

/** The rule's own sentence: frontmatter unless it is a placeholder. */
export function ruleSummary(
  plugin: string,
  rule: string,
  frontmatter: string | undefined,
): string {
  const fromManifest = manifestRule(plugin, rule)?.description;
  if (!isPlaceholderDescription(frontmatter, rule)) return frontmatter!.trim();
  return (fromManifest ?? frontmatter ?? `${rule} rule`).trim();
}

export function ruleTitle(plugin: string, rule: string, summary: string) {
  const what = shortWhat(manifestRule(plugin, rule)?.description ?? summary);
  return `${rule}: ${what} | eslint-plugin-${plugin}`;
}

export function ruleDescription(
  plugin: string,
  rule: string,
  summary: string,
): string {
  const cwe = manifestRule(plugin, rule)?.cwe;
  const base = summary.replace(/[\s:]+$/, '');
  const stop = /[.!?]$/.test(base) ? '' : '.';
  return `${base}${stop} ESLint rule ${plugin}/${rule} in eslint-plugin-${plugin}${cwe ? ` (${cwe})` : ''}.`;
}

export function pluginTitle(plugin: string): string {
  const what = PLUGIN_SEARCH_TITLES[plugin];
  return what ? `eslint-plugin-${plugin}: ${what}` : `eslint-plugin-${plugin}`;
}

export function pluginDescription(
  plugin: string,
  frontmatter: string | undefined,
): string {
  const base = (frontmatter ?? PLUGIN_SEARCH_TITLES[plugin] ?? '').trim();
  const stop = /[.!?]$/.test(base) ? '' : '.';
  const n = pluginRuleCount(plugin);
  return `${base}${stop} ${n} rules, with a copy-paste ESLint flat config (eslint.config.js) and an oxlint config.`;
}

// ── Dates ────────────────────────────────────────────────────────────────

const DATES = contentDates as {
  content: Record<string, string>;
  packages: Record<string, string>;
};

const latest = (...dates: (string | undefined)[]): string | undefined =>
  dates
    .filter((d): d is string => Boolean(d))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];

/**
 * Last commit date of what the page shows: its MDX file, plus the README a
 * plugin page renders live or the CHANGELOG a changelog page renders.
 * Undefined when unknown — never a build timestamp.
 */
export function docsDateModified(
  contentPath: string,
  slugs: readonly string[],
): string | undefined {
  const own = DATES.content[contentPath];
  const kind = classifyDocsSlugs(slugs);
  if (kind.kind === 'plugin')
    return latest(
      own,
      DATES.packages[`eslint-plugin-${kind.plugin}/README.md`],
    );
  if (kind.kind === 'changelog')
    return latest(
      own,
      DATES.packages[`eslint-plugin-${kind.plugin}/CHANGELOG.md`],
    );
  return own;
}

// ── JSON-LD ──────────────────────────────────────────────────────────────

export interface Crumb {
  name: string;
  /** Site-relative path, e.g. `/docs/security`. */
  path: string;
}

export function breadcrumbList(crumbs: readonly Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${SITE_ORIGIN}${c.path === '/' ? '/' : c.path}`,
    })),
  };
}

export function cweTerm(cwe: string) {
  const id = cwe.replace(/^CWE-/i, '');
  return {
    '@type': 'DefinedTerm',
    name: `CWE-${id}`,
    termCode: `CWE-${id}`,
    url: `https://cwe.mitre.org/data/definitions/${id}.html`,
    inDefinedTermSet: 'https://cwe.mitre.org/data/index.html',
  };
}

export function pluginSourceCode(
  plugin: string,
  opts: { path: string; description?: string; dateModified?: string },
) {
  const pkg = `eslint-plugin-${plugin}`;
  return {
    '@type': 'SoftwareSourceCode',
    name: pkg,
    ...(opts.description ? { description: opts.description } : {}),
    url: `${SITE_ORIGIN}${opts.path}`,
    codeRepository: `https://github.com/ofri-peretz/eslint/tree/main/packages/${pkg}`,
    programmingLanguage: ['JavaScript', 'TypeScript'],
    runtimePlatform: 'Node.js',
    license: 'https://opensource.org/licenses/MIT',
    sameAs: [`https://www.npmjs.com/package/${pkg}`],
    keywords: ['ESLint', 'ESLint plugin', 'flat config', 'oxlint', pkg],
    author: AUTHOR,
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
  };
}

export function ruleTechArticle(opts: {
  plugin: string;
  rule: string;
  path: string;
  pluginPath: string;
  headline: string;
  description: string;
  dateModified?: string;
}) {
  const cwe = manifestRule(opts.plugin, opts.rule)?.cwe;
  const url = `${SITE_ORIGIN}${opts.path}`;
  return {
    '@type': 'TechArticle',
    headline: opts.headline,
    description: opts.description,
    url,
    mainEntityOfPage: url,
    inLanguage: 'en',
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
    author: AUTHOR,
    publisher: PUBLISHER,
    ...(cwe ? { about: cweTerm(cwe) } : {}),
    isPartOf: pluginSourceCode(opts.plugin, { path: opts.pluginPath }),
    keywords: [
      'ESLint',
      `${opts.plugin}/${opts.rule}`,
      `eslint-plugin-${opts.plugin}`,
      ...(cwe ? [cwe] : []),
    ],
  };
}

export function techArticle(opts: {
  path: string;
  headline: string;
  description?: string;
  dateModified?: string;
}) {
  const url = `${SITE_ORIGIN}${opts.path}`;
  return {
    '@type': 'TechArticle',
    headline: opts.headline,
    ...(opts.description ? { description: opts.description } : {}),
    url,
    mainEntityOfPage: url,
    inLanguage: 'en',
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
    author: AUTHOR,
    publisher: PUBLISHER,
  };
}

/** One `@graph` document, ready for a `<script type="application/ld+json">`. */
export function jsonLdGraph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

/**
 * Serialises for an inline script. `<` is escaped so a `</script>` inside any
 * string value cannot end the element (descriptions come from content files).
 */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** BreadcrumbList for a top-level page (`/plugins`, `/stats`, …). */
export function topLevelJsonLd(name: string, path: string) {
  return jsonLdGraph(
    breadcrumbList([
      { name: 'Home', path: '/' },
      { name, path },
    ]),
  );
}

/** The home page: what the site is and who publishes it. */
export function homeJsonLd(description: string) {
  return jsonLdGraph(
    {
      '@type': 'WebSite',
      name: 'ESLint Interlace',
      url: `${SITE_ORIGIN}/`,
      description,
      inLanguage: 'en',
      publisher: PUBLISHER,
    },
    {
      ...PUBLISHER,
      sameAs: ['https://github.com/ofri-peretz/eslint'],
      founder: AUTHOR,
    },
  );
}

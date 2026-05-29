/**
 * Auto-extract per-component metadata from a primitive's source content.
 *
 * Each `packages/ui/src/primitives/<name>.tsx` carries a structured JSDoc
 * header (R1-R26 mapping table, ## Anatomy section, MIN_VIEWPORT rationale)
 * plus the actual primitive code. Rather than authoring this data twice —
 * once in source, once in MDX — we parse the source at render time. The
 * source is the single source of truth (DESIGN_PRINCIPLES #12).
 *
 * All helpers are pure functions on the raw `content` string returned by
 * `loadItem(name).files[0].content`. No filesystem I/O.
 */

export type RRuleEntry = {
  rule: string;
  concept: string;
  location: string;
};

export type CvaVariant = {
  name: string;
  options: string[];
  defaultValue?: string;
};

export type ComponentMetadata = {
  minViewport: number | null;
  isClient: boolean;
  anatomy: string | null;
  rRules: RRuleEntry[];
  variants: CvaVariant[];
  exports: string[];
  baseUiImport: string | null;
  lucideIcons: string[];
};

const MIN_VIEWPORT_RE = /export\s+const\s+MIN_VIEWPORT\s*=\s*(\d+)/;
const USE_CLIENT_RE = /^\s*(?:\/\*[\s\S]*?\*\/\s*)*(?:\/\/[^\n]*\n\s*)*['"]use client['"]/m;
const ANATOMY_RE = /##\s*Anatomy\b([\s\S]*?)(?=\n\s*##\s|\n\s*\*\/|$)/;
const R_RULE_ROW_RE = /\*?\s*\|\s*(R\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/g;
const EXPORT_RE = /\bexport\s+(?:const|function|class|type)\s+(\w+)/g;
const BASE_UI_IMPORT_RE = /from\s+['"]@base-ui\/react\/([\w-]+)['"]/;
const LUCIDE_IMPORT_BLOCK_RE = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/;

/**
 * Strip JSDoc comment formatting (* prefixes, leading/trailing whitespace,
 * embedded markdown table separators) so anatomy / table content is readable.
 */
const stripJsdoc = (s: string): string =>
  s
    .replace(/^\s*\*\s?/gm, '')
    .replace(/^\s+|\s+$/g, '');

export function extractMinViewport(content: string): number | null {
  const m = content.match(MIN_VIEWPORT_RE);
  return m ? Number.parseInt(m[1], 10) : null;
}

export function extractIsClient(content: string): boolean {
  return USE_CLIENT_RE.test(content);
}

export function extractAnatomy(content: string): string | null {
  const m = content.match(ANATOMY_RE);
  if (!m) return null;
  const body = stripJsdoc(m[1]);
  // Drop any trailing "MIN_VIEWPORT" / R-rule table headers if the anatomy
  // section runs into them (some primitives don't blank-line-separate).
  return body.split(/\n##\s|\n\|\s*Rule\s*\|/)[0]?.trim() || null;
}

export function extractRRules(content: string): RRuleEntry[] {
  const rules: RRuleEntry[] = [];
  // Reset lastIndex on the global regex
  R_RULE_ROW_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = R_RULE_ROW_RE.exec(content)) !== null) {
    const concept = stripJsdoc(match[2]);
    const location = stripJsdoc(match[3]);
    // Skip the table header row.
    if (/^\s*concept\s*$/i.test(concept) || /^[-]+$/.test(concept)) continue;
    rules.push({
      rule: match[1],
      concept,
      location,
    });
  }
  return rules;
}

export function extractVariants(content: string): CvaVariant[] {
  // Match a cva(...) call and extract its `variants` object.
  // We look for a `variants:` key inside any object literal.
  const variantsBlock = content.match(/variants:\s*\{([\s\S]*?)\n\s*\}\s*,?\s*\n\s*(?:defaultVariants|compoundVariants|\})/);
  if (!variantsBlock) return [];
  const block = variantsBlock[1];

  // Find each top-level "key: { ... }" within the block.
  const variants: CvaVariant[] = [];
  // Find variant names at the top level (indented by 6+ spaces inside cva).
  const keyRe = /^\s+(\w+):\s*\{([\s\S]*?)\n\s+\}/gm;
  let m: RegExpExecArray | null;
  while ((m = keyRe.exec(block)) !== null) {
    const name = m[1];
    if (name === 'variants' || name === 'defaultVariants' || name === 'compoundVariants') continue;
    const optionsBlock = m[2];
    const options = Array.from(
      optionsBlock.matchAll(/['"]([\w-]+)['"]\s*:/g),
      (mm) => mm[1],
    );
    if (options.length === 0) continue;
    variants.push({ name, options });
  }

  // Pull default values from defaultVariants if present.
  const defaultsBlock = content.match(/defaultVariants:\s*\{([\s\S]*?)\n\s*\}/);
  if (defaultsBlock) {
    const defaults: Record<string, string> = {};
    const defRe = /(\w+):\s*['"]([\w-]+)['"]/g;
    let dm: RegExpExecArray | null;
    while ((dm = defRe.exec(defaultsBlock[1])) !== null) {
      defaults[dm[1]] = dm[2];
    }
    for (const v of variants) {
      if (defaults[v.name]) v.defaultValue = defaults[v.name];
    }
  }

  return variants;
}

export function extractExports(content: string): string[] {
  const names = new Set<string>();
  EXPORT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = EXPORT_RE.exec(content)) !== null) {
    if (m[1] === 'default') continue;
    names.add(m[1]);
  }
  // Also handle `export { Foo, Bar }` re-export blocks.
  const reExports = content.matchAll(/\bexport\s*\{([^}]+)\}/g);
  for (const r of reExports) {
    for (const part of r[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[1]?.trim() ?? part.trim();
      if (name && /^\w+$/.test(name)) names.add(name);
    }
  }
  return Array.from(names).sort();
}

export function extractBaseUiImport(content: string): string | null {
  const m = content.match(BASE_UI_IMPORT_RE);
  return m ? m[1] : null;
}

export function extractLucideIcons(content: string): string[] {
  const m = content.match(LUCIDE_IMPORT_BLOCK_RE);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((p) => p.trim())
    .filter((p) => /^\w+$/.test(p))
    .sort();
}

export function extractMetadata(content: string): ComponentMetadata {
  return {
    minViewport: extractMinViewport(content),
    isClient: extractIsClient(content),
    anatomy: extractAnatomy(content),
    rRules: extractRRules(content),
    variants: extractVariants(content),
    exports: extractExports(content),
    baseUiImport: extractBaseUiImport(content),
    lucideIcons: extractLucideIcons(content),
  };
}

#!/usr/bin/env tsx
/**
 * Write every rule's `meta.schema` options into its docs Options table.
 *
 * #359 fixed the breaking direction of this drift — options documented but
 * absent from the schema, which abort the consumer's whole lint run because
 * every schema sets `additionalProperties: false`. This is the other
 * direction: options that work but are written down nowhere, so in practice
 * nobody can find them.
 *
 * The schema is the source of truth. A description comes from the schema's own
 * `description`, or from SHARED_OPTION_DOCS for the handful of names that the
 * devkit's `SecurityRuleOptions` defines once for the whole ecosystem. If
 * neither has one, the option is *reported, not invented* — a made-up
 * description is worse than a missing one, because it reads as authoritative.
 *
 *   tsx scripts/document-rule-options.ts           # write
 *   tsx scripts/document-rule-options.ts --check   # report only, exit 1 on drift
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const PACKAGES = join(import.meta.dirname, '../packages');
const CHECK = process.argv.includes('--check');

/**
 * Options the devkit defines for every security rule (see
 * `SecurityRuleOptions` in packages/eslint-devkit/src/security/security-utils.ts).
 * They carry no per-rule schema description because they are not per-rule.
 */
const SHARED_OPTION_DOCS: Record<string, string> = {
  allowInTests: 'Skip this rule in `*.test.*` / `*.spec.*` files',
  ignoreInTests: 'Skip this rule in `*.test.*` / `*.spec.*` files',
  trustedSanitizers: 'Extra function names to treat as sanitizers',
  trustedAnnotations: 'Extra JSDoc annotations to treat as safe markers',
  trustedOrmPatterns: 'Extra ORM call patterns to treat as safe',
  strictMode: 'Disable false-positive suppression — report even sanitized input',
  severity: 'Override the reported severity for this rule',
  compliance: 'Compliance context (frameworks, ticket template, risk owner)',
};

interface RuleLike {
  meta?: { schema?: unknown; docs?: { description?: string } };
  create?: unknown;
  defaultOptions?: unknown[];
}

interface Prop {
  type?: string | string[];
  description?: string;
  default?: unknown;
  enum?: unknown[];
  items?: { type?: string };
}

/**
 * Escape a value so it cannot break out of its table cell.
 *
 * Every cell goes through this, not just prose: `no-improper-sanitization`
 * documents `dangerousChars`, whose default list literally contains `|`, and
 * an unescaped one silently eats the rest of the row (MD056).
 */
function cell(text: string): string {
  // Prose cell. Backslashes first, then pipes: escaping pipes alone would let
  // a backslash already in the text pair up with the one we add, re-exposing
  // the delimiter it was meant to neutralise.
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim();
}

/**
 * A value rendered inside a backtick code span.
 *
 * Only `|` is escaped here, and deliberately so. A backslash inside a code
 * span is already literal, so doubling it would make the doc *wrong* — it
 * printed `"\\\\.(test|spec)"` for a default that is really `"\\.(test|spec)"`,
 * turning a correct regex into one a reader would copy and be unable to use.
 * The pipe is the sole character that still breaks a table row inside code.
 */
function codeCell(value: string): string {
  const text = value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  // A backtick inside the value would close the span early — `dangerousChars`
  // lists one among the characters it expects a sanitizer to handle, so its default ended
  // mid-array and the rest of the row rendered as plain text. CommonMark's
  // answer is a fence longer than any run of backticks in the content, with a
  // space of padding so a leading or trailing backtick still belongs to the
  // value rather than to the fence.
  const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  if (longest === 0) return `\`${text}\``;
  const fence = '`'.repeat(longest + 1);
  return `${fence} ${text} ${fence}`;
}

/** Render a schema property's type as it appears in the Type column. */
function renderType(prop: Prop): string {
  if (Array.isArray(prop.enum)) return prop.enum.map((v) => codeCell(JSON.stringify(v))).join(' \\| ');
  const base = Array.isArray(prop.type) ? prop.type[0] : prop.type;
  if (base === 'array') return codeCell(`${prop.items?.type ?? 'unknown'}[]`);
  return codeCell(String(base ?? 'unknown'));
}

/** Default from the schema, falling back to the rule's own defaultOptions. */
function renderDefault(name: string, prop: Prop, rule: RuleLike): string {
  const fromRule = (rule.defaultOptions?.[0] as Record<string, unknown> | undefined)?.[name];
  const value = prop.default ?? fromRule;
  if (value === undefined) return '—';
  return codeCell(JSON.stringify(value));
}

/** The doc's contents, or undefined when there is no doc for this rule. */
function readDoc(path: string): string | undefined {
  try {
    return readFileSync(path, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

function schemaProps(rule: RuleLike): Record<string, Prop> {
  const schema = rule.meta?.schema;
  const first = Array.isArray(schema) ? schema[0] : schema;
  return ((first as { properties?: Record<string, Prop> } | undefined)?.properties ?? {});
}

/**
 * Descriptions already written by hand in the doc's Options table, keyed by
 * option name. Regeneration must not throw away prose a human wrote just
 * because the schema has no `description` of its own.
 */
function existingDescriptions(markdown: string): Record<string, string> {
  const section = markdown.split(/^##+ /m).find((s) => /^[^A-Za-z\n]*options\b/i.test(s));
  if (section === undefined) return {};
  const out: Record<string, string> = {};
  for (const row of section.matchAll(/^\|\s*`([A-Za-z_$][\w$]*)`\s*\|([^\n]*)\|\s*$/gm)) {
    const cells = row[2]!.split('|');
    const description = cells.at(-1)?.trim();
    if (description) out[row[1]!] = description;
  }
  return out;
}

function buildTable(
  rule: RuleLike,
  props: Record<string, Prop>,
  written: Record<string, string>,
): { table: string; undescribed: string[] } {
  const undescribed: string[] = [];
  const rows = Object.entries(props).map(([name, prop]) => {
    const description = prop.description ?? SHARED_OPTION_DOCS[name] ?? written[name];
    if (description === undefined) undescribed.push(name);
    return `| \`${name}\` | ${renderType(prop)} | ${renderDefault(name, prop, rule)} | ${cell(description ?? '')} |`;
  });
  const table = [
    '| Option | Type | Default | Description |',
    '| ------ | ---- | ------- | ----------- |',
    ...rows,
  ].join('\n');
  return { table, undescribed };
}

/**
 * Replace the table under the existing Options heading, or append a new
 * Options section before the first following `##` heading.
 */
function applyTable(markdown: string, table: string): string {
  const heading = /^(##+\s*[^A-Za-z\n]*Options\b.*)$/m.exec(markdown);
  if (heading === null) {
    // No Options section: add one at the end, which is where a reader looks
    // last and where it cannot break an existing narrative flow.
    return `${markdown.trimEnd()}\n\n## ⚙️ Options\n\n${table}\n`;
  }
  const start = heading.index + heading[0].length;
  const rest = markdown.slice(start);
  const existingTable = /\n+\|[^\n]*\|\n\|[\s|:-]+\|\n(?:\|[^\n]*\|\n)*/.exec(rest);
  if (existingTable !== null && existingTable.index < 4) {
    return markdown.slice(0, start) + `\n\n${table}\n` + rest.slice(existingTable.index + existingTable[0].length);
  }
  return markdown.slice(0, start) + `\n\n${table}\n` + rest;
}

const skipped: string[] = [];
let written = 0;
const drifted: string[] = [];

async function main(): Promise<void> {
for (const pkg of readdirSync(PACKAGES).sort()) {
  const rulesDir = join(PACKAGES, pkg, 'src/rules');
  const docsDir = join(PACKAGES, pkg, 'docs/rules');
  if (!existsSync(rulesDir) || !existsSync(docsDir)) continue;

  for (const name of readdirSync(rulesDir).sort()) {
    const source = join(rulesDir, name, 'index.ts');
    const docPath = join(docsDir, `${name}.md`);
    if (!existsSync(source)) continue;

    const module = (await import(pathToFileURL(source).href)) as Record<string, unknown>;
    const rule = Object.values(module).find(
      (v): v is RuleLike => typeof v === 'object' && v !== null && 'meta' in v && 'create' in v,
    );
    if (!rule) continue;

    const props = schemaProps(rule);
    if (Object.keys(props).length === 0) continue;

    // Read and let a missing file be the answer, rather than asking whether it
    // exists and then reading it. The two-step version is a race, and the
    // failure it invites is silent: the doc is gone by the time we read it and
    // the script reports having checked a rule it never opened.
    const markdown = readDoc(docPath);
    if (markdown === undefined) continue;
    const { table, undescribed } = buildTable(rule, props, existingDescriptions(markdown));
    if (undescribed.length > 0) {
      skipped.push(`${pkg}/${name}: ${undescribed.join(', ')}`);
      continue;
    }

    // Regenerate unconditionally and diff the result, rather than only filling
    // in names that are missing. A table can be wrong without being incomplete
    // — a `|` in a default value eats the rest of its row — and a generator
    // that only ever appends would never repair its own output.
    const updated = applyTable(markdown, table);
    if (updated === markdown) continue;

    drifted.push(`${pkg}/${name}`);
    if (!CHECK) {
      writeFileSync(docPath, updated);
      written++;
    }
  }
}

if (skipped.length > 0) {
  console.log(`\nNO DESCRIPTION AVAILABLE — needs a schema \`description\` written by hand (${skipped.length} rules):`);
  for (const s of skipped) console.log(`  ${s}`);
}
console.log(`\n${CHECK ? 'would update' : 'updated'}: ${drifted.length} rule docs`);
if (CHECK && (drifted.length > 0 || skipped.length > 0)) process.exit(1);
console.log(written > 0 ? `wrote ${written} files` : 'nothing to write');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

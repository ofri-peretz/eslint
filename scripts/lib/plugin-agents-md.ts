/**
 * plugin-agents-md.ts — renders the consumer-facing AGENTS.md that ships in
 * each eslint-plugin-* npm tarball.
 *
 * Pure function of package metadata (package.json, the plugin's exported
 * `configs` and `rules`, and the security-linting skill's stack map). No file
 * is hand-written, so a rule added or a preset renamed changes the file, and
 * scripts/__tests__/plugin-agents-md.lock.test.ts fails until it is
 * regenerated with `npm run agents-md`.
 *
 * This is NOT the contributor guide. Contributor instructions live in the
 * repository-root AGENTS.md; they are wrong inside a consumer's node_modules,
 * which is why check-published-artifacts.ts used to forbid shipping any
 * AGENTS.md. It now forbids only one that lacks the generated marker below.
 */
import { format, resolveConfig } from 'prettier';

import { AGENTS_MD_MARKER } from './agents-md-marker.ts';

export { AGENTS_MD_EXCLUDED, AGENTS_MD_MARKER } from './agents-md-marker.ts';

export type Severity = 'error' | 'warn';

export interface StackRow {
  package: string;
  dependencies?: string[];
  dependencyPrefixes?: string[];
  always?: boolean;
  why: string;
}

export interface PluginFacts {
  name: string;
  description: string;
  keywords: string[];
  homepage?: string;
  eslintRange?: string;
  nodeRange?: string;
  hasOxlintEntry: boolean;
  /** preset name to rule name (no plugin prefix) to severity */
  presets: Record<string, Record<string, Severity>>;
  /** rule name to description */
  rules: Record<string, string>;
  /** config key the preset registers the plugin under, e.g. `secure-coding` */
  pluginKey: string;
}

type RawEntry = unknown;

export function normalizeSeverity(v: RawEntry): Severity | 'off' {
  const s = Array.isArray(v) ? v[0] : v;
  if (s === 2 || s === 'error') return 'error';
  if (s === 1 || s === 'warn') return 'warn';
  return 'off';
}

/** Facts from a loaded plugin module and its package.json. */
export function factsFrom(
  pkg: Record<string, any>,
  mod: Record<string, any>,
): PluginFacts {
  const configs: Record<string, any> =
    mod.configs ?? mod.default?.configs ?? {};
  const rules: Record<string, any> = mod.rules ?? mod.default?.rules ?? {};
  const presets: PluginFacts['presets'] = {};
  let pluginKey = '';
  for (const [name, cfg] of Object.entries(configs)) {
    const entries: Record<string, Severity> = {};
    for (const [id, v] of Object.entries<RawEntry>(cfg?.rules ?? {})) {
      const sev = normalizeSeverity(v);
      if (sev === 'off') continue;
      entries[id.slice(id.indexOf('/') + 1)] = sev;
    }
    presets[name] = entries;
    if (!pluginKey) pluginKey = Object.keys(cfg?.plugins ?? {})[0] ?? '';
  }
  const bare = String(pkg.name).replace(/^eslint-plugin-/, '');
  return {
    name: pkg.name,
    description: pkg.description ?? '',
    keywords: pkg.keywords ?? [],
    homepage: pkg.homepage,
    eslintRange: pkg.peerDependencies?.eslint,
    nodeRange: pkg.engines?.node,
    hasOxlintEntry: Boolean(pkg.exports?.['./oxlint']),
    presets,
    rules: Object.fromEntries(
      Object.entries(rules).map(([k, r]) => [
        k,
        String(r?.meta?.docs?.description ?? '')
          .replace(/\s+/g, ' ')
          .trim(),
      ]),
    ),
    pluginKey: pluginKey || bare,
  };
}

const camel = (pkg: string) =>
  pkg
    .replace(/^eslint-plugin-/, '')
    .replace(/-(\w)/g, (_, c) => c.toUpperCase());

const cap = (s: string) => (s.endsWith('.') ? s : `${s}.`);

const stripQuery = (u?: string) => (u ? u.replace(/\?.*$/, '') : undefined);

export async function renderAgentsMd(
  f: PluginFacts,
  stack: { plugins: StackRow[] },
  filepath: string,
): Promise<string> {
  const id = camel(f.name);
  const isSecurity =
    f.keywords.includes('security') || /-security$/.test(f.name);
  const out: string[] = [];
  out.push(AGENTS_MD_MARKER, '', `# ${f.name}`, '');
  out.push(
    `Guide for AI coding assistants using this plugin in a project. To change the plugin's own source, read https://github.com/ofri-peretz/eslint/blob/main/AGENTS.md instead.`,
    '',
    `> ${cap(f.description)}`,
    '',
  );

  out.push(
    '## Enable it',
    '',
    '```bash',
    `npm install --save-dev ${f.name}`,
    '```',
    '',
  );
  const reqs = [
    f.eslintRange ? `ESLint ${f.eslintRange}` : '',
    f.nodeRange ? `Node ${f.nodeRange}` : '',
  ].filter(Boolean);
  if (reqs.length) out.push(`Requires ${reqs.join(' and ')}.`, '');
  const first = f.presets.recommended
    ? 'recommended'
    : Object.keys(f.presets)[0];
  out.push(
    '```js',
    '// eslint.config.mjs',
    `import ${id} from '${f.name}';`,
    '',
    'export default [',
    `  ${id}.configs.${/^[a-z]+$/i.test(first ?? '') ? first : `['${first}']`},`,
    '];',
    '```',
    '',
    `Each preset is one flat config object: put it in the array as an element, do not spread it. Rule ids are prefixed \`${f.pluginKey}/\`. Add it to the config you already have; do not remove other plugins. TypeScript files need a TypeScript parser in the config (\`typescript-eslint\`).`,
    '',
  );
  if (isSecurity)
    out.push(
      'Use it alongside `eslint-plugin-security`, not instead of it: keep that plugin if the project has it. Measured overlap and the limits of both: https://eslint.interlace.tools/docs/getting-started/with-eslint-plugin-security',
      '',
    );

  // Presets.
  const names = Object.keys(f.presets);
  out.push('## Presets', '');
  out.push(
    '| Preset | Rules | Errors | Warnings |',
    '| --- | --- | --- | --- |',
  );
  for (const n of names) {
    const v = Object.values(f.presets[n]);
    out.push(
      `| \`${n}\` | ${v.length} | ${v.filter((s) => s === 'error').length} | ${v.filter((s) => s === 'warn').length} |`,
    );
  }
  out.push('');
  const rec = f.presets.recommended;
  for (const n of names) {
    const p = f.presets[n];
    const ids = Object.keys(p);
    const supersetOfRec =
      rec && n !== 'recommended' && Object.keys(rec).every((r) => r in p);
    const shown = supersetOfRec ? ids.filter((r) => !(r in rec)) : ids;
    if (supersetOfRec && shown.length === 0) {
      out.push(`### \`${n}\``, '', 'Same rules as `recommended`.', '');
      continue;
    }
    out.push(
      `### \`${n}\``,
      '',
      supersetOfRec
        ? `Everything in \`recommended\` plus ${shown.length} more${
            Object.keys(rec).some((r) => rec[r] !== p[r])
              ? ' (some shared rules run at a different severity here)'
              : ''
          }:`
        : `${ids.length} rule${ids.length === 1 ? '' : 's'}:`,
      '',
    );
    for (const r of shown)
      out.push(`- \`${r}\` (${p[r]}): ${cap(f.rules[r] || 'no description')}`);
    out.push('');
  }

  const unlisted = Object.keys(f.rules).filter(
    (r) => !names.some((n) => r in f.presets[n]),
  );
  if (unlisted.length)
    out.push(
      '### Rules in no preset',
      '',
      `Enable these by name (\`'${f.pluginKey}/<rule>': 'error'\`):`,
      '',
      ...unlisted.map(
        (r) => `- \`${r}\`: ${cap(f.rules[r] || 'no description')}`,
      ),
      '',
    );

  if (isSecurity) {
    out.push('## Other Interlace plugins by dependency', '');
    out.push(
      'If the project also depends on one of these, add the matching plugin the same way:',
      '',
    );
    for (const row of stack.plugins) {
      if (row.package === f.name || row.always) continue;
      const deps = [
        ...(row.dependencies ?? []),
        ...(row.dependencyPrefixes ?? []).map((p) => `${p}*`),
      ];
      if (deps.length === 0) continue;
      out.push(
        `- ${deps.map((d) => `\`${d}\``).join(', ')}: \`${row.package}\``,
      );
    }
    out.push(
      '',
      'The full stack-to-plugin playbook (with config rendering and a proof step) is the `security-linting` skill: https://github.com/ofri-peretz/eslint/tree/main/skills/security-linting',
      '',
    );
  }

  out.push('## More', '');
  const docs = stripQuery(f.homepage);
  if (docs) out.push(`- Docs: ${docs}`);
  out.push('- README.md in this package: every rule with examples.');
  if (f.hasOxlintEntry)
    out.push(
      `- \`${f.name}/oxlint\` is an entry point for oxlint's JS plugin support; see the README.`,
    );
  out.push('');

  const raw = out.join('\n');
  const config = (await resolveConfig(filepath)) ?? {};
  return format(raw, { ...config, parser: 'markdown', filepath });
}

/**
 * Data behind the "Next step" block on rule pages. Everything derives from the
 * plugin registry and the synced rules manifest: no rule page, and no plugin,
 * carries hand-written text for it (the same contract as `EngineSetup`).
 */
import manifest from '@/data/rules-manifest.json';
import { PLUGINS_BY_SLUG, pluginDocsPath } from '@/lib/plugins';
import { REPO_URL } from '@/lib/github-stars';

export interface RuleNextStep {
  plugin: string;
  /** npm package, `eslint-plugin-<plugin>`. */
  pkg: string;
  /** One-line install command (npm; the page's tabs below cover the other managers). */
  install: string;
  /** Flat config enabling the plugin's `recommended` preset. */
  config: string;
  pluginPath: string;
  npmUrl: string;
  /** The plugin's directory in the monorepo. */
  repoUrl: string;
  ruleCount: number;
  recommendedCount: number;
}

/** The recommended-preset flat config, identical to the plugin page's (`EngineTabs`, `preset`). */
export function recommendedFlatConfig(pkg: string): string {
  return `import { configs } from '${pkg}';\n\nexport default [configs.recommended];\n`;
}

export function ruleNextStep(plugin: string): RuleNextStep | null {
  const entry = PLUGINS_BY_SLUG[plugin];
  const pluginPath = pluginDocsPath(plugin);
  if (!entry || !pluginPath) return null;
  const own = manifest.rules.filter((r) => r.prefix === plugin);
  return {
    plugin,
    pkg: entry.package,
    install: `npm install -D ${entry.package}`,
    config: recommendedFlatConfig(entry.package),
    pluginPath,
    npmUrl: `https://www.npmjs.com/package/${entry.package}`,
    repoUrl: `${REPO_URL}/tree/main/packages/${entry.package}`,
    ruleCount: own.length,
    recommendedCount: own.filter((r) => r.recommended && !r.deprecated).length,
  };
}

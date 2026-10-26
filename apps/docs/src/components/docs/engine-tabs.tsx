'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { Tabs, Tab } from 'fumadocs-ui/components/tabs';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';

import { InstallSnippet } from '@/components/mdx/install-snippet';

/**
 * EngineTabs — install + config for both engines a plugin runs on.
 *
 * oxlint / Vite+ is the first tab and the default; ESLint is second. The
 * choice is remembered site-wide (fumadocs `groupId` + `persist`) and
 * deep-linkable by fragment (DEEP_LINKING_PHILOSOPHY: tab state lives in the
 * fragment, defaults never appear in the URL): `#engine-eslint` opens the
 * ESLint tab, and choosing oxlint strips it again.
 */

export const ENGINE_GROUP = 'lint-engine';
export const ESLINT_ANCHOR = 'engine-eslint';
const OXLINT_TAB = 'oxlint / Vite+';
const ESLINT_TAB = 'ESLint';

export interface EngineTabsProps {
  /** Plugin slug, e.g. `jwt-security`. */
  plugin: string;
  /** Rules to enable, as `{ '<plugin>/<rule>': severity }`. */
  rules: Record<string, string>;
  /** Plugin page: ESLint uses the `recommended` preset instead of listing rules. */
  preset?: boolean;
}

function camel(slug: string) {
  return slug.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
}

function indent(json: string, by: string) {
  return json.replace(/\n/g, `\n${by}`);
}

export function EngineTabs({ plugin, rules, preset }: EngineTabsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const alias = `oxlint-plugin-${plugin}`;
  const pkg = `eslint-plugin-${plugin}`;
  const rulesJson = JSON.stringify(rules, null, 2);

  const oxlintrc = `{\n  "jsPlugins": ["${alias}"],\n  "rules": ${indent(rulesJson, '  ')}\n}`;
  const viteRules = Object.entries(rules)
    .map(([id, level]) => `      '${id}': '${level}',`)
    .join('\n');
  const viteConfig = `import { defineConfig } from 'vite-plus';\n\nexport default defineConfig({\n  lint: {\n    jsPlugins: ['${alias}'],\n    rules: {\n${viteRules}\n    },\n  },\n});`;
  const eslintConfig = preset
    ? `import { configs } from '${pkg}';\n\nexport default [configs.recommended];`
    : `import ${camel(plugin)} from '${pkg}';\n\nexport default [\n  {\n    plugins: { '${plugin}': ${camel(plugin)} },\n    rules: ${indent(rulesJson.replace(/"/g, "'"), '    ')},\n  },\n];`;

  /**
   * Mirror the engine choice into the fragment. Capture-phase, on our own
   * wrapper, for clicks and arrow keys alike; reads the active trigger of the
   * outer tablist only (the package-manager tabs inside are not ours).
   */
  function syncHash(event: React.SyntheticEvent) {
    const list = ref.current?.querySelector('[role="tablist"]');
    if (!list?.contains(event.target as Node)) return;
    requestAnimationFrame(() => {
      const active = list.querySelector('[data-state="active"]')?.textContent;
      const current = window.location.hash.slice(1);
      const { pathname, search } = window.location;
      if (active === ESLINT_TAB) {
        if (current === '' || current === ESLINT_ANCHOR) {
          window.history.replaceState(null, '', `#${ESLINT_ANCHOR}`);
        }
      } else if (current === ESLINT_ANCHOR) {
        window.history.replaceState(null, '', pathname + search);
      }
    });
  }

  return (
    // Capture-phase listener observing the real tab buttons inside; adds no
    // interactive surface of its own.
    <div
      ref={ref}
      onClickCapture={syncHash}
      onKeyUpCapture={syncHash}
      data-testid="engine-tabs"
    >
      <Tabs items={[OXLINT_TAB, ESLINT_TAB]} groupId={ENGINE_GROUP} persist>
        <Tab value={OXLINT_TAB} data-engine="oxlint">
          <InstallSnippet packages={alias} dev />
          <DynamicCodeBlock
            lang="json"
            code={oxlintrc}
            codeblock={{ title: '.oxlintrc.json' }}
          />
          <DynamicCodeBlock
            lang="ts"
            code={viteConfig}
            codeblock={{ title: 'vite.config.ts' }}
          />
          <p className="text-sm text-fd-muted-foreground">
            <code>{alias}</code> re-exports <code>{pkg}/oxlint</code>: the same
            rules under the same IDs, and no ESLint install.{' '}
            <Link href="/docs/oxlint">Why oxlint</Link>.
          </p>
        </Tab>
        <Tab value={ESLINT_TAB} id={ESLINT_ANCHOR} data-engine="eslint">
          <InstallSnippet packages={pkg} dev />
          <DynamicCodeBlock
            lang="js"
            code={eslintConfig}
            codeblock={{ title: 'eslint.config.js' }}
          />
        </Tab>
      </Tabs>
    </div>
  );
}

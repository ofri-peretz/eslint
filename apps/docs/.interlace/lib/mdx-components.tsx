/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * Default MDX component registry — shared across all Interlace docs sites.
 *
 * Composition flow:
 *   consumer's `src/mdx-components.tsx`
 *     → calls `getDefaultMDXComponents()`
 *     → spreads in any site-specific overrides
 *     → returns the merged record
 *
 * Site-specific components (e.g. ESLint's <RulesTable />) stay in the consumer
 * and are added in the consumer's wrapper.
 */

import defaultFumadocsComponents from 'fumadocs-ui/mdx';
import * as Twoslash from 'fumadocs-twoslash/ui';
import { Steps, Step } from 'fumadocs-ui/components/steps';
import { Tabs, Tab } from 'fumadocs-ui/components/tabs';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import type { MDXComponents } from 'mdx/types';
import { Mermaid } from '../components/mdx/mermaid';
import {
  ServerlessConfigTabs,
  Yaml as ServerlessConfigYaml,
  Typescript as ServerlessConfigTypescript,
  Javascript as ServerlessConfigJavascript,
  Json as ServerlessConfigJson,
} from '../components/docs/serverless-config-tabs';
import {
  InstallSnippet,
  PackageManagerTabs,
  NpmTab,
  PnpmTab,
  YarnTab,
  BunTab,
} from '../components/docs/install-snippet';
import { PluginScorecard } from '../components/docs/plugin-scorecard';
import { ComparisonMatrix } from '../components/docs/comparison-matrix';

/**
 * Returns the baseline MDX component map. Consumer wrappers should call this
 * and spread in any extra site-specific components on top.
 *
 * @example consumer wrapper at `src/mdx-components.tsx`
 * ```tsx
 * import type { MDXComponents } from 'mdx/types';
 * import { getDefaultMDXComponents } from '@/.interlace/lib/mdx-components';
 * import { RulesTable } from '@/components/docs/rules-table';
 *
 * export function useMDXComponents(components?: MDXComponents): MDXComponents {
 *   return {
 *     ...getDefaultMDXComponents(),
 *     RulesTable, // site-specific
 *     ...components,
 *   };
 * }
 * ```
 */
export function getDefaultMDXComponents(): MDXComponents {
  return {
    ...defaultFumadocsComponents,
    ...Twoslash,
    Mermaid,
    Steps,
    Step,
    Tabs,
    Tab,
    Accordion,
    Accordions,
    ServerlessConfigTabs,
    ServerlessConfigYaml,
    ServerlessConfigTypescript,
    ServerlessConfigJavascript,
    ServerlessConfigJson,
    InstallSnippet,
    PackageManagerTabs,
    NpmTab,
    PnpmTab,
    YarnTab,
    BunTab,
    PluginScorecard,
    ComparisonMatrix,
  };
}

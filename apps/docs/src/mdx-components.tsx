import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { Callout } from 'fumadocs-ui/components/callout';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { Steps, Step } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { RelatedArticles } from '@/components/DevToArticles';
import { Mermaid } from '@/components/Mermaid';
import { ComparisonSection } from '@/components/ComparisonSection';
import { BenchmarkCharts } from '@/components/BenchmarkCharts';
import { CTAButton, CTACard, CTAGrid } from '@/components/ui/cta';
import { PluginCard, PluginCards } from '@/components/PluginCard';
import { LLMWorkflowDemo } from '@/components/LLMWorkflowDemo';
import { ESLintEcosystemBeam } from '@/components/ESLintEcosystemBeam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { Changelog, ChangelogItem } from '@/components/Changelog';
import { GitHubChangelog } from '@/components/GitHubChangelog';
import { EcosystemStats } from '@/components/EcosystemStats';
import { LLMErrorDemo } from '@/components/LLMErrorDemo';
import { Tree, Folder, File } from '@/components/ui/file-tree';
import { ReadmeRulesTable } from '@/components/ReadmeRulesTable';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    // Proper code block wrapper as per Fumadocs docs
    pre: (props) => (
      <CodeBlock>
        <Pre>{props.children}</Pre>
      </CodeBlock>
    ),
    Callout,
    Card,
    Cards,
    Steps,
    Step,
    Tab,
    Tabs,
    RelatedArticles,
    Mermaid,
    ComparisonSection,
    BenchmarkCharts,
    CTAButton,
    CTACard,
    CTAGrid,
    PluginCard,
    PluginCards,
    LLMWorkflowDemo,
    LLMErrorDemo,
    ESLintEcosystemBeam,
    NumberTicker,
    Changelog,
    ChangelogItem,
    GitHubChangelog,
    EcosystemStats,
    Tree,
    Folder,
    File,
    ReadmeRulesTable,
    ...components,
  };
}




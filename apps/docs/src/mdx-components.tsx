import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { Callout } from 'fumadocs-ui/components/callout';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { Steps, Step } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { RelatedArticles } from '@/components/DevToArticles';
import { Mermaid } from '@/components/Mermaid';
import { ComparisonSection } from '@/components/ComparisonSection';
import { BenchmarkCharts } from '@/components/BenchmarkCharts';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
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
    ...components,
  };
}




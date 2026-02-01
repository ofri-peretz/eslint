import defaultMdxComponents from 'fumadocs-ui/mdx';
import * as Twoslash from 'fumadocs-twoslash/ui';
import { Mermaid } from '@/components/mdx/mermaid';
import { Steps, Step } from 'fumadocs-ui/components/steps';
import { Tabs, Tab } from 'fumadocs-ui/components/tabs';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import type { MDXComponents } from 'mdx/types';

/**
 * MDX components registry
 * 
 * Includes:
 * - Default Fumadocs components (Callout, Card, etc.)
 * - Twoslash TypeScript inline hints
 * - Mermaid diagram rendering
 * - Steps/Step for multi-step guides
 * - Tabs/Tab for tabbed content
 * - Accordion/Accordions for collapsible sections
 */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...Twoslash, // TypeScript code hints
    Mermaid, // Diagram rendering
    Steps, // Multi-step guides
    Step,
    Tabs, // Tabbed content
    Tab,
    Accordion, // Collapsible sections
    Accordions,
    ...components,
  };
}

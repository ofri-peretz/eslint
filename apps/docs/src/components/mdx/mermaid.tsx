'use client';

import { useTheme } from 'next-themes';
import { Mermaid as MermaidBase, type MermaidProps } from '@interlace/ui/mdx/mermaid';

/**
 * App-local Mermaid wrapper that bridges `next-themes` (used site-wide for
 * fumadocs theming) into the framework-agnostic `<Mermaid>` from
 * `@interlace/ui/mdx/mermaid`.
 *
 * Usage in MDX:
 *   <Mermaid chart="graph TD; A-->B; B-->C;" />
 */
export function Mermaid(props: Omit<MermaidProps, 'theme'>) {
  const { resolvedTheme } = useTheme();
  return (
    <MermaidBase
      {...props}
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
    />
  );
}

/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
'use client';

import { useEffect, useId, useState } from 'react';
import { useTheme } from 'next-themes';

/**
 * Mermaid diagram renderer for MDX content.
 *
 * Usage in MDX:
 *   <Mermaid chart="graph TD; A-->B; B-->C;" />
 *
 * The component dynamically imports `mermaid` so it doesn't bloat the initial
 * bundle. Theme follows next-themes resolved value.
 */
export function Mermaid({ chart }: { chart: string }) {
  const [mounted, setMounted] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = useId().replace(/:/g, '-');
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !chart) return;

    const renderDiagram = async () => {
      try {
        // mermaid is an optional peer dep — install it in the consumer if you
        // use <Mermaid> in MDX. The ts-ignore lets sites that don't use it
        // skip the install without breaking typecheck.
        // @ts-ignore optional peer dep
        const mermaid = (await import('mermaid')).default;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          fontFamily: 'inherit',
          themeCSS: 'margin: 1.5rem auto 0;',
          theme: resolvedTheme === 'dark' ? 'dark' : 'default',
        });

        const normalizedChart = chart.replace(/\\n/g, '\n').replace(/\\"/g, '"');
        const { svg } = await mermaid.render(`mermaid-${id}`, normalizedChart);
        setSvgContent(svg);
        setError(null);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        setSvgContent(null);
      }
    };

    renderDiagram();
  }, [mounted, chart, resolvedTheme, id]);

  if (!mounted) {
    return (
      <div className="my-6 p-4 bg-muted/50 rounded-lg" suppressHydrationWarning>
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-6 p-4 border border-destructive/50 rounded-lg bg-destructive/10">
        <p className="text-sm text-destructive">Failed to render diagram: {error}</p>
        <pre className="mt-2 text-xs overflow-auto max-h-32">
          <code>{chart.substring(0, 200)}...</code>
        </pre>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div className="my-6 p-4 bg-muted/50 rounded-lg animate-pulse">
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div
      className="my-6 overflow-x-auto"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

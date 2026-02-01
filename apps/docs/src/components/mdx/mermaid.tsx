'use client';

import { useEffect, useId, useState } from 'react';
import { useTheme } from 'next-themes';

/**
 * Mermaid diagram component for rendering diagrams in documentation
 * 
 * Usage in MDX:
 * <Mermaid chart="graph TD; A-->B; B-->C;" />
 */
export function Mermaid({ chart }: { chart: string }) {
  const [mounted, setMounted] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = useId().replace(/:/g, '-'); // Sanitize React's useId for mermaid
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !chart) return;

    const renderDiagram = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          fontFamily: 'inherit',
          themeCSS: 'margin: 1.5rem auto 0;',
          theme: resolvedTheme === 'dark' ? 'dark' : 'default',
        });

        // Convert escaped newlines to actual newlines
        const normalizedChart = chart
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"');

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
    // Use suppressHydrationWarning to handle SSR/CSR mismatch
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
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}


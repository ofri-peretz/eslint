'use client';

import { useEffect, useId, useState } from 'react';

import { cn } from '../lib/cn.js';

export interface MermaidProps {
  /** Mermaid chart source. Supports both raw text and MDX-attribute-escaped (`\n`, `\"`) input. */
  chart: string;
  /** Resolved theme (`'light' | 'dark'`). If not provided, falls back to `prefers-color-scheme`. */
  theme?: 'light' | 'dark';
  /** Optional class on the wrapper div. */
  className?: string;
  /** Optional CSS injected into mermaid (e.g., `'margin: 1.5rem auto 0;'`). */
  themeCSS?: string;
}

function usePrefersDark(): boolean {
  const [isDark, setIsDark] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isDark;
}

/**
 * Mermaid diagram renderer for MDX.
 *
 * Usage:
 *   <Mermaid chart="graph TD; A-->B;" />
 *
 * To integrate with `next-themes`, wrap or pass the resolved theme:
 *   const { resolvedTheme } = useTheme();
 *   <Mermaid theme={resolvedTheme === 'dark' ? 'dark' : 'light'} chart="..." />
 */
export function Mermaid({
  chart,
  theme,
  className,
  themeCSS = 'margin: 1.5rem auto 0;',
}: MermaidProps) {
  const [mounted, setMounted] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = useId().replace(/:/g, '-');
  const prefersDark = usePrefersDark();
  const resolved = theme ?? (prefersDark ? 'dark' : 'light');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !chart) return;
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          fontFamily: 'inherit',
          themeCSS,
          theme: resolved === 'dark' ? 'dark' : 'default',
        });
        const normalizedChart = chart
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"');
        const { svg } = await mermaid.render(`mermaid-${id}`, normalizedChart);
        if (!cancelled) {
          setSvgContent(svg);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
          setSvgContent(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, chart, resolved, id, themeCSS]);

  if (!mounted) return null;
  if (error)
    return (
      <div
        className={cn(
          'border-destructive/50 bg-destructive/5 text-destructive rounded-md border p-3 text-sm',
          className,
        )}
      >
        Mermaid render error: {error}
      </div>
    );
  if (!svgContent) return null;
  return (
    <div
      className={cn('flex justify-center', className)}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: mermaid SVG output is the component's purpose
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

export default Mermaid;

'use client';

import { use, useId, useSyncExternalStore, useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

// Use useSyncExternalStore for hydration-safe client detection
const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function Mermaid({ chart }: { chart: string }) {
  const isClient = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);
  
  if (!isClient) return <div className="animate-pulse bg-violet-500/10 h-64 rounded-xl" />;
  
  return <MermaidContent chart={chart} />;
}

const cache = new Map<string, Promise<unknown>>();

function cachePromise<T>(key: string, setPromise: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached) return cached as Promise<T>;
  const promise = setPromise();
  cache.set(key, promise);
  return promise;
}

function MermaidContent({ chart }: { chart: string }) {
  const id = useId();
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [panZoom, setPanZoom] = useState<any>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  
  const { default: mermaid } = use(
    cachePromise('mermaid', () => import('mermaid'))
  );
  
  const isDark = resolvedTheme === 'dark';
  
  // Use neutral theme as base for better text rendering
  // Then apply custom colors for branding
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    fontFamily: 'Inter, system-ui, sans-serif',
    theme: 'neutral',
    themeVariables: {
      // Background colors
      primaryColor: isDark ? '#3b2d5c' : '#ede9fe',
      secondaryColor: isDark ? '#2d3748' : '#f3f4f6',
      tertiaryColor: isDark ? '#1e293b' : '#ffffff',
      background: isDark ? '#141a21' : '#ffffff',
      mainBkg: isDark ? '#1e293b' : '#ffffff',
      
      // Text - MUST be fully opaque and contrasting
      primaryTextColor: isDark ? '#f1f5f9' : '#1e293b',
      secondaryTextColor: isDark ? '#e2e8f0' : '#374151',
      tertiaryTextColor: isDark ? '#cbd5e1' : '#4b5563',
      textColor: isDark ? '#f1f5f9' : '#1e293b',
      nodeTextColor: isDark ? '#f1f5f9' : '#1e293b',
      
      // Borders and lines
      primaryBorderColor: isDark ? '#a78bfa' : '#7c3aed',
      lineColor: isDark ? '#94a3b8' : '#64748b',
      nodeBorder: isDark ? '#a78bfa' : '#7c3aed',
      
      // Labels
      labelTextColor: isDark ? '#f1f5f9' : '#1e293b',
      labelBackground: isDark ? '#1e293b' : '#ffffff',
      
      // Clusters/Subgraphs
      clusterBkg: isDark ? '#1e293b' : '#f8fafc',
      clusterBorder: isDark ? '#475569' : '#cbd5e1',
      titleColor: isDark ? '#f1f5f9' : '#1e293b',
      
      // Edges
      edgeLabelBackground: isDark ? '#1e293b' : '#ffffff',
      
      // Sequence diagram specific
      actorTextColor: isDark ? '#f1f5f9' : '#1e293b',
      actorBkg: isDark ? '#2d3548' : '#ede9fe',
      actorBorder: isDark ? '#a78bfa' : '#7c3aed',
      signalColor: isDark ? '#f1f5f9' : '#1e293b',
      signalTextColor: isDark ? '#f1f5f9' : '#1e293b',
      noteBkgColor: isDark ? '#2d3548' : '#fef9c3',
      noteTextColor: isDark ? '#f1f5f9' : '#1e293b',
      noteBorderColor: isDark ? '#a78bfa' : '#7c3aed',
      activationBkgColor: isDark ? '#3b2d5c' : '#ede9fe',
      activationBorderColor: isDark ? '#a78bfa' : '#7c3aed',
      sequenceNumberColor: isDark ? '#f1f5f9' : '#1e293b',
      
      // Fonts
      fontSize: '14px',
    },
  });
  
  const { svg, bindFunctions } = use(
    cachePromise(`${chart}-${resolvedTheme}`, () => {
      return mermaid.render(id, chart.replaceAll('\\n', '\n'));
    })
  );
  
  // Initialize pan-zoom functionality
  useEffect(() => {
    if (!containerRef.current) return;
    
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;
    
    // Dynamic import of panzoom
    import('panzoom').then(({ default: panzoom }) => {
      const instance = panzoom(svgElement, {
        maxZoom: 4,
        minZoom: 0.5,
        bounds: true,
        boundsPadding: 0.1,
        zoomDoubleClickSpeed: 1,
      });
      
      instance.on('zoom', () => {
        setIsZoomed(true);
      });
      
      setPanZoom(instance);
      
      return () => {
        instance.dispose();
      };
    });
  }, [svg]);
  
  const handleReset = () => {
    if (panZoom) {
      panZoom.moveTo(0, 0);
      panZoom.zoomAbs(0, 0, 1);
      setIsZoomed(false);
    }
  };
  
  return (
    <div className="hidden sm:block my-6 rounded-xl border border-violet-500/20 bg-fd-card overflow-hidden">
      {/* Control buttons */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-violet-500/10 bg-violet-500/5">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
          <span>Drag to pan • Scroll to zoom</span>
        </div>
        {isZoomed && (
          <button
            onClick={handleReset}
            className="ml-auto text-xs px-2 py-1 rounded bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 transition-colors"
          >
            Reset View
          </button>
        )}
      </div>
      
      {/* Mermaid diagram container */}
      <div className="p-4 overflow-hidden">
        <div
          ref={(container) => {
            if (container) {
              bindFunctions?.(container);
              containerRef.current = container;
            }
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
          className="flex justify-center min-w-fit [&_svg]:max-w-none [&_svg]:cursor-move"
        />
      </div>
      
      {/* Mobile fallback message */}
      <div className="sm:hidden p-4 text-center text-sm text-muted-foreground bg-amber-500/10 border-l-4 border-amber-500">
        📱 Interactive diagram hidden on mobile. View on desktop for zoom/pan controls.
      </div>
    </div>
  );
}

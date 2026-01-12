'use client';

import { use, useId, useSyncExternalStore, useEffect, useRef, useState, useCallback } from 'react';
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
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [panZoom, setPanZoom] = useState<any>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  
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
    if (!svgContainerRef.current) return;
    
    const svgElement = svgContainerRef.current.querySelector('svg');
    if (!svgElement) return;
    
    // Dynamic import of panzoom
    import('panzoom').then(({ default: panzoom }) => {
      const instance = panzoom(svgElement, {
        maxZoom: 5,
        minZoom: 0.3,
        bounds: true,
        boundsPadding: 0.1,
        zoomDoubleClickSpeed: 1,
        beforeWheel: (e) => {
          // Allow wheel events for zooming but prevent page scroll
          const target = e.target as HTMLElement;
          return !target || svgElement.contains(target);
        },
        zoomSpeed: 0.065,
        smoothScroll: false,
      });
      
      instance.on('zoom', (pz: typeof instance) => {
        setZoomLevel(pz.getTransform().scale);
      });
      
      instance.on('pan', () => {
        setZoomLevel(instance.getTransform().scale);
      });
      
      setPanZoom(instance);
      
      return () => {
        instance.dispose();
      };
    });
  }, [svg]);
  
  const handleZoomIn = useCallback(() => {
    if (panZoom) {
      panZoom.smoothZoom(0, 0, 1.2);
    }
  }, [panZoom]);
  
  const handleZoomOut = useCallback(() => {
    if (panZoom) {
      panZoom.smoothZoom(0, 0, 0.8);
    }
  }, [panZoom]);
  
  const handleReset = useCallback(() => {
    if (panZoom) {
      panZoom.moveTo(0, 0);
      panZoom.zoomAbs(0, 0, 1);
      setZoomLevel(1);
    }
  }, [panZoom]);
  
  const handleFit = useCallback(() => {
    if (panZoom && svgContainerRef.current) {
      const svg = svgContainerRef.current.querySelector('svg');
      if (!svg) return;
      
      const container = svgContainerRef.current;
      const svgRect = svg.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      const scaleX = (containerRect.width * 0.9) / svgRect.width;
      const scaleY = (containerRect.height * 0.9) / svgRect.height;
      const scale = Math.min(scaleX, scaleY, 1);
      
      panZoom.moveTo(0, 0);
      panZoom.zoomAbs(0, 0, scale);
      setZoomLevel(scale);
    }
  }, [panZoom]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;
      
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleReset();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleZoomIn, handleZoomOut, handleReset]);
  
  const ControlButton = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded bg-fd-background hover:bg-violet-500/10 border border-violet-500/20 transition-colors flex items-center justify-center"
    >
      {children}
    </button>
  );
  
  return (
    <div ref={containerRef} className="hidden sm:block my-6 rounded-xl border border-violet-500/20 bg-fd-card overflow-hidden">
      {/* Control bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-violet-500/10 bg-violet-500/5">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>Drag • Scroll • Zoom</span>
          <span className="text-violet-500 ml-2">{Math.round(zoomLevel * 100)}%</span>
        </div>
        
        {/* Control buttons */}
        <div className="flex items-center gap-1">
          <ControlButton onClick={handleZoomOut} title="Zoom out (-)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </ControlButton>
          
          <ControlButton onClick={handleZoomIn} title="Zoom in (+)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </ControlButton>
          
          <ControlButton onClick={handleFit} title="Fit to window">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          </ControlButton>
          
          <ControlButton onClick={handleReset} title="Reset (0)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </ControlButton>
        </div>
      </div>
      
      {/* Mermaid diagram container */}
      <div className="p-4 overflow-hidden bg-fd-background/50" style={{ height: '500px' }}>
        <div
          ref={(container) => {
            if (container) {
              bindFunctions?.(container);
              svgContainerRef.current = container;
            }
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
          className="h-full flex items-center justify-center [&_svg]:max-w-none [&_svg]:cursor-grab [&_svg:active]:cursor-grabbing"
        />
      </div>
      
      {/* Mobile fallback */}
      <div className="sm:hidden p-4 text-center text-sm text-muted-foreground bg-amber-500/10 border-l-4 border-amber-500">
        📱 Interactive diagram hidden on mobile. View on desktop for full controls.
      </div>
    </div>
  );
}

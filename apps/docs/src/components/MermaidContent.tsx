'use client';

import { useId, useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { X, Loader2 } from 'lucide-react';

const mermaidCache = new Map<string, string>();

export function MermaidContent({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, 'm');
  const { resolvedTheme } = useTheme();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);
  
  const [svg, setSvg] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [panZoom, setPanZoom] = useState<any>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const isDark = resolvedTheme === 'dark';

  // 1. Mermaid Rendering Logic with fixed theme colors
  useEffect(() => {
    let active = true;
    const render = async () => {
      if (!chart || chart.trim().length === 0) return;
      
      setIsLoading(true);
      setRenderError(null);
      try {
        const { default: mermaid } = await import('mermaid');
        
        // Enhanced theme variables for proper text visibility
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          fontFamily: 'Inter, system-ui, sans-serif',
          theme: isDark ? 'dark' : 'default',
          themeVariables: isDark ? {
            // Dark mode - ensure text is visible
            fontSize: '14px',
            primaryColor: '#a78bfa',
            primaryTextColor: '#f1f5f9',
            primaryBorderColor: '#6366f1',
            secondaryColor: '#3730a3',
            secondaryTextColor: '#e2e8f0',
            tertiaryColor: '#1e293b',
            tertiaryTextColor: '#cbd5e1',
            lineColor: '#94a3b8',
            textColor: '#f1f5f9',
            mainBkg: '#1e293b',
            nodeBkg: '#1e293b',
            nodeTextColor: '#f1f5f9',
            clusterBkg: '#0f172a',
            clusterBorder: '#6366f1',
            titleColor: '#f1f5f9',
            edgeLabelBackground: '#1e293b',
            actorTextColor: '#f1f5f9',
            actorBkg: '#1e293b',
            actorBorder: '#6366f1',
            signalTextColor: '#f1f5f9',
            labelTextColor: '#f1f5f9',
            loopTextColor: '#f1f5f9',
            noteBkgColor: '#312e81',
            noteTextColor: '#e2e8f0',
            noteBorderColor: '#6366f1',
          } : {
            // Light mode - ensure text is visible
            fontSize: '14px',
            primaryColor: '#7c3aed',
            primaryTextColor: '#1e293b',
            primaryBorderColor: '#7c3aed',
            secondaryColor: '#ede9fe',
            secondaryTextColor: '#1e293b',
            tertiaryColor: '#f8fafc',
            tertiaryTextColor: '#334155',
            lineColor: '#64748b',
            textColor: '#1e293b',
            mainBkg: '#ffffff',
            nodeBkg: '#ffffff',
            nodeTextColor: '#1e293b',
            clusterBkg: '#f1f5f9',
            clusterBorder: '#7c3aed',
            titleColor: '#1e293b',
            edgeLabelBackground: '#ffffff',
            actorTextColor: '#1e293b',
            actorBkg: '#ffffff',
            actorBorder: '#7c3aed',
            signalTextColor: '#1e293b',
            labelTextColor: '#1e293b',
            loopTextColor: '#1e293b',
            noteBkgColor: '#ede9fe',
            noteTextColor: '#1e293b',
            noteBorderColor: '#7c3aed',
          }
        });

        const cleanChart = chart.replace(/\\n/g, '\n').trim();
        // Use a simple alphanumeric ID for Mermaid
        const safeId = `m${Math.abs(hashString(cleanChart)).toString(36)}`;
        const cacheKey = `${cleanChart}-${resolvedTheme}`;
        
        let content: string;
        if (mermaidCache.has(cacheKey)) {
          content = mermaidCache.get(cacheKey)!;
        } else {
          // Create a temporary hidden container for rendering to avoid ID collisions and target issues
          const renderDiv = document.createElement('div');
          renderDiv.style.visibility = 'hidden';
          renderDiv.style.position = 'absolute';
          document.body.appendChild(renderDiv);

          try {
            const { svg: renderedSvg } = await mermaid.render(`svg-${safeId}`, cleanChart, renderDiv);
            content = renderedSvg;
          } catch (renderErr) {
            console.warn('Initial mermaid render failed, retrying without init block:', renderErr);
            const strippedChart = cleanChart.replace(/%%\{init:[\s\S]*?\}%%/, '').trim();
            const { svg: retrySvg } = await mermaid.render(`svg-retry-${safeId}`, strippedChart, renderDiv);
            content = retrySvg;
          } finally {
            document.body.removeChild(renderDiv);
          }
          mermaidCache.set(cacheKey, content);
        }

        if (active) {
          setSvg(content);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error('Mermaid render failure:', err);
        if (active) {
          setRenderError(err.message || 'Diagram synthesis failed');
          setIsLoading(false);
        }
      }
    };

    render();
    return () => { active = false; };
  }, [chart, resolvedTheme, isDark]);

  // Helper for deterministic IDs
  function hashString(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
  }

  // 2. Centering Logic - Centers diagram and fits to 95% of canvas for immediate visibility
  const performCentering = useCallback((instance: any, isInitial = false) => {
    if (!instance || !canvasRef.current || !transformRef.current?.firstChild) return;
    
    const svgEl = transformRef.current.firstChild as SVGSVGElement;
    if (!svgEl || svgEl.tagName !== 'svg') return;
    
    const canvas = canvasRef.current;
    const cW = canvas.clientWidth;
    const cH = canvas.clientHeight;
    
    // Safety return for hidden containers
    if (cW < 50 || cH < 50) return;

    let sW: number = 0;
    let sH: number = 0;
    
    // Priority 1: viewBox (most reliable for Mermaid-generated SVGs)
    const vb = svgEl.viewBox?.baseVal;
    if (vb && vb.width > 0 && vb.height > 0) {
      sW = vb.width;
      sH = vb.height;
    }
    
    // Priority 2: explicit width/height attributes
    if (sW <= 0 || sH <= 0) {
      const attrW = parseFloat(svgEl.getAttribute('width') || '0');
      const attrH = parseFloat(svgEl.getAttribute('height') || '0');
      if (attrW > 0 && attrH > 0) {
        sW = attrW;
        sH = attrH;
      }
    }
    
    // Priority 3: getBBox (requires element to be rendered)
    if (sW <= 0 || sH <= 0) {
      try {
        const box = svgEl.getBBox();
        if (box.width > 0 && box.height > 0) {
          sW = box.width;
          sH = box.height;
        }
      } catch (e) {
        // getBBox can fail if element isn't rendered
      }
    }
    
    // Priority 4: bounding rect
    if (sW <= 0 || sH <= 0) {
      const rect = svgEl.getBoundingClientRect();
      sW = rect.width || 600;
      sH = rect.height || 400;
    }

    // Final fallback
    if (sW <= 0) sW = 600;
    if (sH <= 0) sH = 400;

    // Calculate scale to fit 95% of canvas - ensures diagram is prominently visible on load
    const fitScale = Math.min((cW * 0.95) / sW, (cH * 0.95) / sH);
    // Don't cap at 1.0 - allow diagram to scale up if needed for visibility
    let scale = fitScale;
    
    // Clamp scale to readable ranges (allow larger scale for better initial visibility)
    scale = Math.min(Math.max(scale, 0.3), 3.0);
    
    // Center the diagram in the canvas
    const x = (cW - sW * scale) / 2;
    const y = (cH - sH * scale) / 2;
    
    instance.zoomAbs(0, 0, scale);
    instance.moveTo(x, y);
  }, []);

  // 3. PanZoom Strategy - Fixed mouse wheel zoom
  useEffect(() => {
    if (isLoading || !svg || !transformRef.current || !canvasRef.current) return;
    
    const target = transformRef.current;
    const canvas = canvasRef.current;
    let instance: any;

    const setup = async () => {
      const { default: createPanZoom } = await import('panzoom');
      instance = createPanZoom(target, {
        maxZoom: 5,
        minZoom: 0.1,
        smoothScroll: true,
        zoomSpeed: 0.065,
        // Return false to ENABLE wheel zoom (beforeWheel returning true would BLOCK it)
        beforeWheel: () => false,
      });

      setPanZoom(instance);
      
      // Robust settle loop for hydration/layout shifts
      setTimeout(() => {
        let pass = 0;
        const itv = setInterval(() => {
          if (canvas.clientWidth > 100) {
            performCentering(instance, true);
            if (pass++ > 10) clearInterval(itv);
          }
        }, 150);
        setTimeout(() => clearInterval(itv), 5000);
      }, 200);
    };

    setup();

    // Prevent page scroll when zooming inside the diagram
    const onWheel = (e: WheelEvent) => {
      if (canvas.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });

    const observer = new ResizeObserver(() => {
      if (instance) performCentering(instance, false);
    });
    observer.observe(canvas);

    return () => {
      if (instance) instance.dispose();
      canvas.removeEventListener('wheel', onWheel);
      observer.disconnect();
    };
  }, [isLoading, svg, performCentering]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full my-6 rounded-xl border border-fd-border bg-fd-card shadow-md overflow-hidden"
    >
      {/* Clean Rendering Surface */}
      <div 
        ref={canvasRef} 
        className="w-full h-[400px] relative cursor-grab active:cursor-grabbing overflow-hidden"
        style={{ 
          background: isDark 
            ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.95) 50%, rgba(15, 23, 42, 0.98) 100%)'
            : 'linear-gradient(135deg, rgba(248, 250, 252, 0.98) 0%, rgba(238, 242, 255, 0.95) 50%, rgba(248, 250, 252, 0.98) 100%)',
        }}
      >
        {/* Subtle dot grid pattern overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: isDark 
              ? 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 1px, transparent 1px)'
              : 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-6 animate-spin text-violet-500" />
            <span className="text-xs font-medium text-fd-muted-foreground">Rendering diagram...</span>
          </div>
        ) : renderError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center bg-fd-card/50">
             <div className="p-2.5 rounded-full bg-red-500/10 text-red-500">
                <X className="size-5" />
             </div>
             <h4 className="text-base font-semibold text-fd-foreground">Render Error</h4>
             <p className="max-w-md text-fd-muted-foreground text-sm font-mono">{renderError}</p>
          </div>
        ) : (
          <div
            ref={transformRef}
            dangerouslySetInnerHTML={{ __html: svg }}
            className="absolute top-0 left-0 block [&_svg]:!block [&_svg]:max-w-none [&_svg]:max-h-none"
            style={{ transformOrigin: '0 0', width: 'max-content', height: 'max-content' }}
          />
        )}
      </div>
    </div>
  );
}

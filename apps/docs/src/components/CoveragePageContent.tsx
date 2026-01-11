'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import { 
  Gauge, 
  ArrowUpRight, 
  ShieldCheck, 
  Zap, 
  Activity, 
  Loader2, 
  FileCode, 
  CheckCircle2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { NumberTicker } from '@/components/ui/number-ticker';
import type { CodecovRepo, CodecovComponent } from '@/lib/api';

const getCoverageColor = (coverage: number) => {
  if (coverage >= 90) return 'text-emerald-500';
  if (coverage >= 80) return 'text-cyan-500';
  if (coverage >= 70) return 'text-orange-500';
  return 'text-red-500';
};

const getCoverageBg = (coverage: number, solid = false) => {
  if (coverage >= 90) return solid ? 'bg-emerald-500' : 'bg-emerald-500/10';
  if (coverage >= 80) return solid ? 'bg-cyan-500' : 'bg-cyan-500/10';
  if (coverage >= 70) return solid ? 'bg-orange-500' : 'bg-orange-500/10';
  return solid ? 'bg-red-500' : 'bg-red-500/10';
};



interface CoveragePageContentProps {
  repo: CodecovRepo | undefined;
  isLoadingRepo: boolean;
  components: CodecovComponent[] | undefined;
  isLoadingComponents: boolean;
}

const ShimmerButton = dynamic(() => import('@/components/ui/shimmer-button').then(m => m.ShimmerButton), { ssr: false });

export function CoveragePageContent({
  repo,
  isLoadingRepo,
  components,
  isLoadingComponents
}: CoveragePageContentProps) {
  const totals = repo?.totals;

  return (
    <div className="space-y-12 py-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-fd-border/50 pb-8">
        <div className="space-y-4">
          <Badge variant="outline" className="border-orange-500/50 text-orange-500 bg-orange-500/5 px-3 py-1">
            <Activity className="size-3 mr-1.5" />
            Live Ecosystem Metrics
          </Badge>
          <h1 className="text-4xl font-black tracking-tight mb-2">Verification & Coverage</h1>
          <p className="text-fd-muted-foreground max-w-2xl text-lg">
            Real-time test coverage metrics for the Interlace ESLint ecosystem. 
            We maintain high standards of testing across all our security plugins to ensure mission-critical stability.
          </p>
        </div>
        
        <a 
          href="https://app.codecov.io/gh/ofri-peretz/eslint" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          <ShimmerButton 
            className="shadow-2xl shadow-[#F01F7A]/20"
            background="#F01F7A"
            shimmerColor="#ffffff"
            shimmerSize="0.10em"
            borderRadius="100px"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-white tracking-wide">
              Full Breakdown on Codecov
              <ArrowUpRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </ShimmerButton>
        </a>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-3xl border bg-fd-card/50 backdrop-blur-sm relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
            <Gauge className="size-20 text-orange-500" />
          </div>
          <div className="relative">
            <div className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-2">Overall Project Coverage</div>
            <div className="text-5xl font-black tracking-tighter flex items-center gap-1">
              {isLoadingRepo ? (
                <Loader2 className="size-8 animate-spin opacity-50" />
              ) : (
                <>
                  <NumberTicker value={Math.floor(totals?.coverage || 0)} />
                  <span className="text-2xl opacity-50">.{((totals?.coverage || 0) % 1 * 10).toFixed(0)}%</span>
                </>
              )}
            </div>
            <p className="text-xs text-fd-muted-foreground mt-2 font-medium">Ecosystem-wide average</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="p-8 rounded-3xl border bg-fd-card/50 backdrop-blur-sm relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
            <FileCode className="size-20 text-cyan-500" />
          </div>
          <div className="relative">
            <div className="text-sm font-bold text-cyan-500 uppercase tracking-widest mb-2">Lines of Code</div>
            <div className="text-5xl font-black tracking-tighter">
              {isLoadingRepo ? (
                <Loader2 className="size-8 animate-spin opacity-50" />
              ) : (
                <NumberTicker value={totals?.lines || 0} />
              )}
            </div>
            <p className="text-xs text-fd-muted-foreground mt-2 font-medium">Verified executable logic</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="p-8 rounded-3xl border bg-fd-card/50 backdrop-blur-sm relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
            <CheckCircle2 className="size-20 text-emerald-500" />
          </div>
          <div className="relative">
            <div className="text-sm font-bold text-emerald-500 uppercase tracking-widest mb-2">Covered Lines</div>
            <div className="text-5xl font-black tracking-tighter">
              {isLoadingRepo ? (
                <Loader2 className="size-8 animate-spin opacity-50" />
              ) : (
                <NumberTicker value={totals?.hits || 0} />
              )}
            </div>
            <p className="text-xs text-fd-muted-foreground mt-2 font-medium">Shielded from regressions</p>
          </div>
        </motion.div>
      </div>

      {/* Components Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black tracking-tight">Plugin Breakdown</h2>
          <div className="h-px flex-1 bg-fd-border/50" />
        </div>

        {isLoadingComponents ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl border bg-fd-card/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {components
              ?.filter(c => !['eslint-plugin-react-features', 'eslint-plugin-architecture', 'eslint-plugin-react-a11y', 'eslint-plugin-quality'].includes(c.name))
              .map((component, index) => (
              <motion.div
                key={component.component_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative p-6 rounded-2xl border bg-fd-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("p-2 rounded-lg", getCoverageBg(component.coverage))}>
                    {component.name.includes('plugin') ? (
                      <ShieldCheck className={cn("size-5", getCoverageColor(component.coverage))} />
                    ) : (
                      <Zap className={cn("size-5", getCoverageColor(component.coverage))} />
                    )}
                  </div>
                  <div className={cn("text-2xl font-black flex items-baseline gap-1", getCoverageColor(component.coverage))}>
                    <NumberTicker value={Math.floor(component.coverage)} />
                    <span className="text-sm opacity-70">.{((component.coverage % 1) * 10).toFixed(0)}%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-base leading-tight group-hover:text-fd-primary transition-colors truncate">
                    {component.name.replace('eslint-plugin-', '')}
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-fd-secondary overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${component.coverage}%` }}
                        transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                        className={cn("h-full rounded-full", getCoverageBg(component.coverage, true))}
                      />
                    </div>
                  </div>
                </div>

                {/* Decorative Glow */}
                <div className={cn(
                  "absolute -right-4 -bottom-4 size-20 blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500",
                  getCoverageBg(component.coverage)
                )} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="rounded-3xl border border-dashed border-fd-border/50 p-10 text-center bg-fd-muted/30">
        <h3 className="text-xl font-bold mb-3 flex items-center justify-center gap-2">
          <Gauge className="size-6 text-orange-500" />
          Standard of Excellence
        </h3>
        <p className="text-fd-muted-foreground max-w-xl mx-auto text-base leading-relaxed">
          We enforce strict coverage gates. Our <strong>Core</strong> security plugins are required to maintain at least <strong>85%</strong> coverage, 
          while experimental or framework-specific plugins target a minimum of <strong>80%</strong>.
        </p>
      </div>
    </div>
  );
}

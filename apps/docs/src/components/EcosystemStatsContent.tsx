'use client';
// Refreshed: 2026-01-10T19:22:00Z

import React from 'react';
import dynamic from 'next/dynamic';
const MotionDiv = dynamic(() => import('motion/react').then(m => m.motion.div), { ssr: false });
import { Shield, Zap, Target, Gauge, Loader2, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCodecovRepo, usePluginStats, type PluginStats } from '@/lib/api';
import { BorderBeam } from './ui/border-beam';

interface EcosystemStatsData {
  rules: number;
  plugins: number;
  coverage: number;
  owaspCoverage: number;
  pipelineRules: number;
  pipelinePlugins: number;
}

export function EcosystemStats() {
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { data: repoData, error: codecovError } = useCodecovRepo();
  const { data: pluginStats } = usePluginStats();

  const stats: EcosystemStatsData = {
    rules: pluginStats?.totalRules ?? 0,
    plugins: pluginStats?.totalPlugins ?? 0,
    coverage: repoData?.totals?.coverage ?? 81.65,
    owaspCoverage: 100,
    pipelineRules: pluginStats ? (pluginStats.plugins.filter(p => !p.published).reduce((acc, p) => acc + p.rules, 0)) : 0,
    pipelinePlugins: pluginStats ? (pluginStats.allPluginsCount - pluginStats.totalPlugins) : 0,
  };

  const displayStats = [
    {
      label: 'Security Rules',
      value: `${stats.rules}+`,
      icon: Shield,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      borderColor: 'border-violet-500/20',
      sublabel: `+${stats.pipelineRules} upcoming`,
      href: '/docs/secure-coding',
      ctaLabel: 'View Rules'
    },
    {
      label: 'ESLint Plugins',
      value: stats.plugins,
      icon: Zap,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
      sublabel: `+${stats.pipelinePlugins} in pipeline`,
      href: '/docs/secure-coding',
      ctaLabel: 'See Plugins'
    },
    {
      label: 'OWASP Coverage',
      value: `${stats.owaspCoverage}%`,
      icon: Target,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      href: '/docs/concepts/how-ast-works',
      ctaLabel: 'Learn More'
    },
    {
      label: 'Test Coverage',
      value: `${stats.coverage.toFixed(1)}%`,
      icon: Gauge,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      sublabel: 'via Codecov',
      href: '/docs/coverage',
      ctaLabel: 'See Coverage'
    }
  ];

  if (!mounted) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="relative p-6 h-[180px] rounded-2xl border bg-fd-card/20 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
      {displayStats.map((stat, index) => (
        <MotionDiv
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
          className={cn(
            "relative group p-6 rounded-2xl border bg-fd-card/50 backdrop-blur-sm transition-all duration-300 flex flex-col items-center text-center",
            "hover:shadow-xl hover:-translate-y-1",
            stat.borderColor
          )}
        >
          {index % 2 === 0 && (
            <BorderBeam size={100} duration={10} colorFrom="#8b5cf6" colorTo="#a855f7" />
          )}

          <div className={cn(
            "p-3 rounded-xl mb-4 transition-transform duration-300 group-hover:scale-110",
            stat.bg,
            stat.color
          )}>
            <stat.icon className="size-6" />
          </div>
          
          <div className="text-3xl font-black tracking-tight mb-1 flex items-center gap-2">
            {!repoData && !codecovError && index === 3 && <Loader2 className="size-5 animate-spin opacity-50" />}
            {stat.value}
          </div>
          
          <div className="text-xs font-bold uppercase tracking-widest text-fd-muted-foreground mb-4">
            {stat.label}
          </div>
          
          {stat.sublabel && (
            <div className="text-[10px] mb-4 font-medium opacity-50 flex items-center gap-1">
              <span className="size-1 rounded-full bg-orange-500 animate-pulse" />
              {stat.sublabel}
            </div>
          )}

          <div className="mt-auto pt-2 w-full">
            <a 
              href={stat.href}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                "bg-fd-secondary text-fd-secondary-foreground hover:bg-fd-primary hover:text-fd-primary-foreground w-full",
                "opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-300"
              )}
            >
              {stat.ctaLabel}
              <ArrowUpRight className="size-3" />
            </a>
          </div>
        </MotionDiv>
      ))}
    </div>
  );
}

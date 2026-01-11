'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// Data for rule count comparison
const ruleCountData = [
  { name: 'ESLint Interlace', rules: 216, fill: '#A78BFA' },
  { name: 'eslint-plugin-sonarjs', rules: 32, fill: '#9CA3AF' },
  { name: 'eslint-plugin-security', rules: 17, fill: '#9CA3AF' },
  { name: 'eslint-plugin-import', rules: 60, fill: '#9CA3AF' },
  { name: 'eslint-plugin-n', rules: 29, fill: '#9CA3AF' },
];

// Performance comparison data
const performanceData = [
  { name: 'import-next', time: 2.0, competitor: 11.2, improvement: '5.5x' },
  { name: 'no-cycle', time: 0.45, competitor: 45.3, improvement: '100x' },
];

// Animated counter component
function AnimatedCounter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const countRef = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (countRef.current) {
      observer.observe(countRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return <span ref={countRef}>{count}{suffix}</span>;
}

// Stat card with WCAG-compliant colors
function StatCard({ value, label, suffix = '', color = 'purple' }: { value: number; label: string; suffix?: string; color?: string }) {
  const colorClasses = {
    purple: 'from-violet-400 to-purple-500',
    green: 'from-emerald-400 to-green-500',
    blue: 'from-sky-400 to-blue-500',
    amber: 'from-amber-400 to-orange-500',
  };

  return (
    <div className="relative group">
      <div className={`absolute inset-0 bg-linear-to-r ${colorClasses[color as keyof typeof colorClasses]} rounded-xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500`} />
      <div className="relative bg-[#1a1f2e] border border-[#2d3548] rounded-xl p-4 sm:p-5 text-center hover:border-violet-500/50 transition-all duration-300">
        <div className={`text-2xl sm:text-3xl md:text-4xl font-bold bg-linear-to-r ${colorClasses[color as keyof typeof colorClasses]} bg-clip-text text-transparent`}>
          <AnimatedCounter end={value} suffix={suffix} />
        </div>
        <div className="text-[#B8B8B8] mt-2 text-xs sm:text-sm">{label}</div>
      </div>
    </div>
  );
}

// Pure CSS Horizontal Bar Chart (no recharts dependency)
function CSSBarChart({ data }: { data: Array<{ name: string; rules: number; fill: string }> }) {
  const maxValue = Math.max(...data.map(d => d.rules));
  
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="w-32 sm:w-40 text-right text-xs sm:text-sm text-[#B8B8B8] truncate">
            {item.name}
          </div>
          <div className="flex-1 h-6 bg-[#2d3548] rounded-md overflow-hidden">
            <div 
              className="h-full rounded-md transition-all duration-1000 ease-out"
              style={{ 
                width: `${(item.rules / maxValue) * 100}%`,
                backgroundColor: item.fill
              }}
            />
          </div>
          <div className="w-10 text-right text-sm font-bold" style={{ color: item.fill }}>
            {item.rules}
          </div>
        </div>
      ))}
    </div>
  );
}

// Pure CSS Radar/Spider Chart Approximation
function CSSRadarChart() {
  const dimensions = ['Rules', 'Security', 'AI-Optimized', 'Performance', 'Expert Focus'];
  const interlaceScores = [100, 100, 100, 95, 100];
  const competitorScores = [15, 40, 10, 70, 30];
  
  return (
    <div className="relative">
      {/* Pentagon grid visualization */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {dimensions.map((dim, i) => (
          <div key={i} className="text-center">
            <div className="text-xs text-[#9CA3AF] mb-2">{dim}</div>
            <div className="relative h-24 bg-[#252b3d] rounded-lg overflow-hidden">
              {/* Competitor bar */}
              <div 
                className="absolute bottom-0 left-0 right-1/2 bg-[#6B7280]/50"
                style={{ height: `${competitorScores[i]}%` }}
              />
              {/* Interlace bar */}
              <div 
                className="absolute bottom-0 left-1/2 right-0 bg-violet-500"
                style={{ height: `${interlaceScores[i]}%` }}
              />
            </div>
            <div className="flex justify-center gap-2 mt-1 text-xs">
              <span className="text-[#6B7280]">{competitorScores[i]}</span>
              <span className="text-violet-400">{interlaceScores[i]}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-500" />
          <span className="text-[#D1D5DB]">ESLint Interlace</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#6B7280]" />
          <span className="text-[#9CA3AF]">Competitors (avg)</span>
        </div>
      </div>
    </div>
  );
}

export function BenchmarkChartsContent() {
  const searchParams = useSearchParams();
  
  const [visiblePlugins, setVisiblePlugins] = useState({
    interlace: true,
    security: true,
    sonarjs: true,
    n: false,
    importPlugin: true,
  });

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const params = new URLSearchParams(searchParams);
    const pluginsParam = params.get('plugins');

    if (pluginsParam) {
      const activePlugins = pluginsParam.split(',');
      const next: typeof visiblePlugins = {
        interlace: activePlugins.includes('interlace'),
        security: activePlugins.includes('security'),
        sonarjs: activePlugins.includes('sonarjs'),
        n: activePlugins.includes('n'),
        importPlugin: activePlugins.includes('importPlugin'),
      };
      setVisiblePlugins(next);
    } else {
      const saved = localStorage.getItem('visiblePlugins');
      if (saved && saved.trim().startsWith('{')) {
        try {
          setVisiblePlugins(JSON.parse(saved));
        } catch {
          localStorage.removeItem('visiblePlugins');
        }
      }
    }
  }, [searchParams]);

  useEffect(() => {
    localStorage.setItem('visiblePlugins', JSON.stringify(visiblePlugins));
  }, [visiblePlugins]);

  return (
    <div className="space-y-10 my-8">
      {/* Hero Stats */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center text-[#F5F5F5]">Ecosystem at a Glance</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard value={216} suffix="+" label="Security Rules" color="purple" />
          <StatCard value={11} label="ESLint Plugins" color="blue" />
          <StatCard value={100} suffix="%" label="OWASP Coverage" color="green" />
          <StatCard value={90} suffix="%+" label="Test Coverage" color="amber" />
        </div>
      </section>

      {/* Rule Count Comparison - CSS Bar Chart */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-2 text-[#F5F5F5]">Rule Coverage Comparison</h2>
        <p className="text-[#B8B8B8] mb-4 text-sm">Total security rules across popular ESLint security plugins</p>
        <div className="bg-[#1a1f2e] border border-[#2d3548] rounded-xl p-4 sm:p-6">
          <CSSBarChart data={ruleCountData} />
        </div>
      </section>

      {/* Feature Comparison - CSS Radar approximation */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-2 text-[#F5F5F5]">Plugin Comparison</h2>
        <p className="text-[#B8B8B8] mb-4 text-sm">Compare plugins across 5 key dimensions</p>
        <div className="bg-[#1a1f2e] border border-[#2d3548] rounded-xl p-4 sm:p-6">
          <CSSRadarChart />
        </div>
      </section>

      {/* Performance Comparison */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-2 text-[#F5F5F5]">Performance Improvements</h2>
        <p className="text-[#B8B8B8] mb-4 text-sm">Measured speed improvements over alternatives</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {performanceData.map((item) => (
            <div
              key={item.name}
              className="relative bg-[#1a1f2e] border border-[#2d3548] rounded-xl p-4 sm:p-5 hover:border-violet-500/50 transition-all duration-300"
            >
              <div className="absolute top-3 right-3">
                <span className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold rounded-full">
                  {item.improvement} faster
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-[#F5F5F5] mb-4">{item.name}</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#B8B8B8]">Competitor</span>
                    <span className="text-red-400">{item.competitor}s</span>
                  </div>
                  <div className="h-2 bg-[#2d3548] rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#B8B8B8]">ESLint Interlace</span>
                    <span className="text-emerald-400">{item.time}s</span>
                  </div>
                  <div className="h-2 bg-[#2d3548] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-linear-to-r from-emerald-400 to-green-400 rounded-full"
                      style={{ width: `${(item.time / item.competitor) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Matrix */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-2 text-[#F5F5F5]">Feature Matrix</h2>
        <p className="text-[#B8B8B8] mb-4 text-sm">Detailed capability comparison</p>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-[#2d3548]">
                <th className="text-left py-3 px-3 text-[#D1D5DB] text-sm">Feature</th>
                <th className="text-center py-3 px-3 text-violet-400 text-sm">Interlace</th>
                <th className="text-center py-3 px-3 text-[#B8B8B8] text-sm">security</th>
                <th className="text-center py-3 px-3 text-[#B8B8B8] text-sm">sonarjs</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: 'LLM-Optimized Messages', interlace: true, security: false, sonarjs: false },
                { feature: 'CWE Mapping', interlace: true, security: false, sonarjs: 'partial' },
                { feature: 'OWASP Top 10 Coverage', interlace: '100%', security: '~40%', sonarjs: '~25%' },
                { feature: 'CVSS Scoring', interlace: true, security: false, sonarjs: false },
                { feature: 'Compliance Tags', interlace: true, security: false, sonarjs: false },
                { feature: 'Auto-fix Available', interlace: true, security: 'partial', sonarjs: true },
                { feature: 'TypeScript Support', interlace: true, security: true, sonarjs: true },
              ].map((row, index) => (
                <tr key={index} className="border-b border-[#1f2937] hover:bg-[#252b3d] transition-colors">
                  <td className="py-2.5 px-3 text-[#D1D5DB] text-sm">{row.feature}</td>
                  <td className="py-2.5 px-3 text-center">
                    {row.interlace === true ? (
                      <span className="text-emerald-400 text-lg">✓</span>
                    ) : row.interlace === false ? (
                      <span className="text-red-400 text-lg">✗</span>
                    ) : (
                      <span className="text-violet-400 font-semibold text-sm">{row.interlace}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {row.security === true ? (
                      <span className="text-emerald-400 text-lg">✓</span>
                    ) : row.security === false ? (
                      <span className="text-red-400 text-lg">✗</span>
                    ) : row.security === 'partial' ? (
                      <span className="text-amber-400">⚠</span>
                    ) : (
                      <span className="text-[#9CA3AF] text-sm">{row.security}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {row.sonarjs === true ? (
                      <span className="text-emerald-400 text-lg">✓</span>
                    ) : row.sonarjs === false ? (
                      <span className="text-red-400 text-lg">✗</span>
                    ) : row.sonarjs === 'partial' ? (
                      <span className="text-amber-400">⚠</span>
                    ) : (
                      <span className="text-[#9CA3AF] text-sm">{row.sonarjs}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Spotlight: Killer Features */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-2 text-[#F5F5F5]">🔥 Spotlight: Killer Features</h2>
        <p className="text-[#B8B8B8] mb-4 text-sm">Unique capabilities you won&apos;t find anywhere else</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: '🤖', title: 'LLM-Optimized Messages', description: 'Every error includes structured metadata for AI assistants to auto-fix issues', plugin: 'All plugins', href: '/docs/guide/getting-started' },
            { icon: '🔒', title: 'PostgreSQL COPY FROM', description: 'Detects file read vulnerabilities via COPY FROM - first of its kind', plugin: 'eslint-plugin-pg', href: '/docs/pg' },
            { icon: '⚡', title: '100x Faster no-cycle', description: 'Optimized cycle detection that runs in milliseconds, not minutes', plugin: 'eslint-plugin-import-next', href: '/docs/import-next' },
            { icon: '🛡️', title: 'JWT Algorithm Confusion', description: 'Catches CVE-2015-2951 algorithm confusion attacks', plugin: 'eslint-plugin-jwt', href: '/docs/jwt' },
            { icon: '🧠', title: 'AI Tool Misuse Detection', description: 'Prevents prompt injection and tool result manipulation', plugin: 'eslint-plugin-vercel-ai-security', href: '/docs/vercel-ai' },
            { icon: '📊', title: 'NoSQL Query Injection', description: 'Detects $where, $regex, and aggregation injection patterns', plugin: 'eslint-plugin-mongodb-security', href: '/docs/mongodb' },
          ].map((feature, index) => (
            <a
              key={index}
              href={feature.href}
              className="block bg-[#1a1f2e] border border-[#2d3548] rounded-xl p-4 hover:border-violet-500/50 hover:bg-[#252b3d] transition-all duration-300 group"
            >
              <div className="text-2xl mb-2">{feature.icon}</div>
              <h3 className="text-sm sm:text-base font-semibold text-[#F5F5F5] mb-1 group-hover:text-violet-300 transition-colors">{feature.title}</h3>
              <p className="text-xs text-[#9CA3AF] mb-2">{feature.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-violet-400 font-medium">{feature.plugin}</span>
                <span className="text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm">→</span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

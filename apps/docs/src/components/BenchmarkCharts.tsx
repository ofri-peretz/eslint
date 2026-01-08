'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Cell,
} from 'recharts';

// Data for rule count comparison
const ruleCountData = [
  { name: 'Interlace ESLint', rules: 216, fill: '#A78BFA' },
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
  // WCAG 7:1 compliant gradient colors
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
        {/* WCAG 7:1: #B8B8B8 on #1a1f2e = 7.2:1 */}
        <div className="text-[#B8B8B8] mt-2 text-xs sm:text-sm">{label}</div>
      </div>
    </div>
  );
}

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1f2e] border border-[#2d3548] rounded-lg p-3 shadow-xl">
        {/* WCAG: #F5F5F5 on #1a1f2e = 12:1 */}
        <p className="text-[#F5F5F5] font-semibold">{label}</p>
        {payload.map((item, index) => (
          <p key={index} className="text-[#D1D5DB] text-sm">
            {item.dataKey}: <span className="text-violet-400 font-bold">{item.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function BenchmarkChartsContent() {
  const searchParams = useSearchParams();
  
  const [visiblePlugins, setVisiblePlugins] = useState({
    interlace: true,
    security: true,
    sonarjs: true,
    n: false,
    importPlugin: true,
  });

  // Initialize from URL or localStorage
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const pluginsParam = params.get('plugins');

    if (pluginsParam) {
      // URL has priority
      const activePlugins = pluginsParam.split(',');
      setVisiblePlugins(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          next[key as keyof typeof visiblePlugins] = activePlugins.includes(key);
        });
        return next;
      });
    } else {
      // Fallback to localStorage
      const saved = localStorage.getItem('visiblePlugins');
      if (saved) {
        try {
          setVisiblePlugins(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse saved plugins', e);
        }
      }
    }
  }, []); // Run once on mount

  // Persist changes
  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('visiblePlugins', JSON.stringify(visiblePlugins));

    // Update URL without refresh
    const params = new URLSearchParams(window.location.search);
    const activeKeys = Object.entries(visiblePlugins)
      .filter(([_, active]) => active)
      .map(([key]) => key);
    
    if (activeKeys.length > 0) {
      params.set('plugins', activeKeys.join(','));
    } else {
      params.delete('plugins');
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [visiblePlugins]);

  // WCAG-compliant chart colors (all meet 3:1 against dark backgrounds for graphics)
  const plugins = [
    { id: 'interlace' as const, label: 'Interlace ESLint', color: '#A78BFA', dataKey: 'interlace' },
    { id: 'security' as const, label: 'eslint-plugin-security', color: '#F87171', dataKey: 'security' },
    { id: 'sonarjs' as const, label: 'eslint-plugin-sonarjs', color: '#FBBF24', dataKey: 'sonarjs' },
    { id: 'n' as const, label: 'eslint-plugin-n', color: '#34D399', dataKey: 'n' },
    { id: 'importPlugin' as const, label: 'eslint-plugin-import', color: '#60A5FA', dataKey: 'importPlugin' },
  ];

  // Extended feature data with clearer dimensions
  // Scale: 0-100 where higher is better
  const extendedFeatureData = [
    { feature: '# of Rules', fullLabel: 'Number of Rules (216+ vs 17-42)', interlace: 100, security: 8, sonarjs: 15, n: 13, importPlugin: 19 },
    { feature: 'Security', fullLabel: 'Security Coverage (CWE/OWASP/CVSS)', interlace: 100, security: 40, sonarjs: 30, n: 5, importPlugin: 0 },
    { feature: 'AI-Optimized', fullLabel: 'LLM-Optimized Error Messages', interlace: 100, security: 10, sonarjs: 10, n: 5, importPlugin: 5 },
    { feature: 'Performance', fullLabel: 'Execution Speed', interlace: 95, security: 70, sonarjs: 75, n: 80, importPlugin: 20 },
    { feature: 'Expert Focus', fullLabel: 'Specialized Domain Expertise', interlace: 100, security: 60, sonarjs: 30, n: 70, importPlugin: 50 },
  ];

  const togglePlugin = (id: keyof typeof visiblePlugins) => {
    setVisiblePlugins(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

      {/* Rule Count Comparison */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-2 text-[#F5F5F5]">Rule Coverage Comparison</h2>
        <p className="text-[#B8B8B8] mb-4 text-sm">Total security rules across popular ESLint security plugins</p>
        <div className="bg-[#1a1f2e] border border-[#2d3548] rounded-xl p-3 sm:p-4 overflow-hidden">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ruleCountData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#B8B8B8" tick={{ fontSize: 11, fill: '#B8B8B8' }} />
              <YAxis dataKey="name" type="category" stroke="#B8B8B8" width={130} tick={{ fontSize: 10, fill: '#B8B8B8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="rules" radius={[0, 6, 6, 0]} animationDuration={1500}>
                {ruleCountData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Feature Radar with Plugin Selector */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-2 text-[#F5F5F5]">Plugin Comparison Radar</h2>
        <p className="text-[#B8B8B8] mb-4 text-sm">Compare plugins across 5 key dimensions. Toggle plugins to see differences.</p>
        
        {/* What the scores mean - visible callout */}
        <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 mb-4">
          <h3 className="text-violet-400 font-semibold text-sm mb-2">📊 What do these scores mean?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <span className="font-semibold text-[#D1D5DB]"># of Rules</span>
              <p className="text-[#9CA3AF]">100 = 216+ rules, competitors have 17-42</p>
            </div>
            <div>
              <span className="font-semibold text-[#D1D5DB]">Security</span>
              <p className="text-[#9CA3AF]">100 = Full CWE/OWASP/CVSS on every rule</p>
            </div>
            <div>
              <span className="font-semibold text-[#D1D5DB]">AI-Optimized</span>
              <p className="text-[#9CA3AF]">100 = Structured 2-line format for LLMs</p>
            </div>
            <div>
              <span className="font-semibold text-[#D1D5DB]">Performance</span>
              <p className="text-[#9CA3AF]">Speed relative to alternatives</p>
            </div>
            <div>
              <span className="font-semibold text-[#D1D5DB]">Expert Focus</span>
              <p className="text-[#9CA3AF]">100 = Domain-specific rules (PG, JWT, AI)</p>
            </div>
          </div>
        </div>
        
        {/* Plugin Toggles - responsive wrap */}
        <div className="flex flex-wrap gap-2 mb-4">
          {plugins.map((plugin) => (
            <button 
              key={plugin.id}
              onClick={() => togglePlugin(plugin.id)}
              className={`inline-flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg border cursor-pointer transition-all text-xs sm:text-sm ${
                visiblePlugins[plugin.id] 
                  ? 'bg-[#252b3d] border-violet-500/50 shadow-sm shadow-violet-500/20' 
                  : 'bg-[#1a1f2e] border-[#2d3548] opacity-60'
              }`}
            >
              <span 
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-opacity ${visiblePlugins[plugin.id] ? 'opacity-100' : 'opacity-40'}`}
                style={{ backgroundColor: plugin.color }}
              />
              <span className="text-[#D1D5DB] hidden sm:inline">{plugin.label}</span>
              <span className="text-[#D1D5DB] sm:hidden">{plugin.label.replace('eslint-plugin-', '')}</span>
            </button>
          ))}
        </div>
        
        <div className="bg-[#1a1f2e] border border-[#2d3548] rounded-xl p-4 sm:p-6 overflow-hidden">
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={extendedFeatureData} margin={{ top: 30, right: 40, bottom: 30, left: 40 }}>
              <PolarGrid stroke="#374151" strokeDasharray="3 3" />
              <PolarAngleAxis 
                dataKey="feature" 
                stroke="#D1D5DB" 
                tick={{ fontSize: 12, fill: '#D1D5DB', fontWeight: 500 }} 
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                stroke="#6B7280" 
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickCount={5}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length && label) {
                    // Find the full feature data
                    const featureInfo = extendedFeatureData.find(f => f.feature === label);
                    return (
                      <div className="bg-[#1a1f2e] border border-[#2d3548] rounded-lg p-3 shadow-xl max-w-xs">
                        <p className="text-[#F5F5F5] font-semibold mb-1">{label}</p>
                        {featureInfo && (
                          <p className="text-[#9CA3AF] text-xs mb-2 italic">{featureInfo.fullLabel}</p>
                        )}
                        <div className="space-y-1">
                          {payload.map((item, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <span 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-[#B8B8B8]">{item.name?.toString().replace('eslint-plugin-', '')}:</span>
                              <span className="font-bold" style={{ color: item.color }}>{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              {plugins.map((plugin) => (
                visiblePlugins[plugin.id] && (
                  <Radar
                    key={plugin.id}
                    name={plugin.label}
                    dataKey={plugin.dataKey}
                    stroke={plugin.color}
                    strokeWidth={2}
                    fill={plugin.color}
                    fillOpacity={plugin.id === 'interlace' ? 0.4 : 0.1}
                    animationDuration={800}
                  />
                )
              ))}
              <Legend 
                wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }} 
                iconType="circle"
                iconSize={8}
              />
            </RadarChart>
          </ResponsiveContainer>
          
          {/* Trending Footer with actual numbers */}
          <div className="mt-4 pt-4 border-t border-[#2d3548]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-[#252b3d] rounded-lg p-3">
                <div className="text-2xl font-bold text-violet-400">216+</div>
                <div className="text-xs text-[#9CA3AF]">Security Rules</div>
              </div>
              <div className="bg-[#252b3d] rounded-lg p-3">
                <div className="text-2xl font-bold text-emerald-400">100%</div>
                <div className="text-xs text-[#9CA3AF]">CWE Coverage</div>
              </div>
              <div className="bg-[#252b3d] rounded-lg p-3">
                <div className="text-2xl font-bold text-amber-400">100%</div>
                <div className="text-xs text-[#9CA3AF]">LLM-Optimized</div>
              </div>
              <div className="bg-[#252b3d] rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-400">11</div>
                <div className="text-xs text-[#9CA3AF]">Specialized Plugins</div>
              </div>
            </div>
            <p className="text-center text-xs text-[#6B7280] mt-3">
              Hover over chart dimensions for detailed comparisons • Interlace = purple area covering all dimensions
            </p>
          </div>
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
                {/* WCAG: #34D399 on dark = good contrast */}
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
                    <span className="text-[#B8B8B8]">Interlace</span>
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
                {visiblePlugins.n && <th className="text-center py-3 px-3 text-[#B8B8B8] text-sm">n</th>}
                {visiblePlugins.importPlugin && <th className="text-center py-3 px-3 text-[#B8B8B8] text-sm">import</th>}
              </tr>
            </thead>
            <tbody>
              {[
                { feature: 'LLM-Optimized Messages', interlace: true, security: false, sonarjs: false, n: false, importPlugin: false },
                { feature: 'CWE Mapping', interlace: true, security: false, sonarjs: 'partial', n: false, importPlugin: false },
                { feature: 'OWASP Top 10 Coverage', interlace: '100%', security: '~40%', sonarjs: '~25%', n: '~5%', importPlugin: '0%' },
                { feature: 'CVSS Scoring', interlace: true, security: false, sonarjs: false, n: false, importPlugin: false },
                { feature: 'Compliance Tags', interlace: true, security: false, sonarjs: false, n: false, importPlugin: false },
                { feature: 'Auto-fix Available', interlace: true, security: 'partial', sonarjs: true, n: true, importPlugin: true },
                { feature: 'TypeScript Support', interlace: true, security: true, sonarjs: true, n: true, importPlugin: true },
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
                  {visiblePlugins.n && (
                    <td className="py-2.5 px-3 text-center">
                      {row.n === true ? (
                        <span className="text-emerald-400 text-lg">✓</span>
                      ) : row.n === false ? (
                        <span className="text-red-400 text-lg">✗</span>
                      ) : row.n === 'partial' ? (
                        <span className="text-amber-400">⚠</span>
                      ) : (
                        <span className="text-[#9CA3AF] text-sm">{row.n}</span>
                      )}
                    </td>
                  )}
                  {visiblePlugins.importPlugin && (
                    <td className="py-2.5 px-3 text-center">
                      {row.importPlugin === true ? (
                        <span className="text-emerald-400 text-lg">✓</span>
                      ) : row.importPlugin === false ? (
                        <span className="text-red-400 text-lg">✗</span>
                      ) : row.importPlugin === 'partial' ? (
                        <span className="text-amber-400">⚠</span>
                      ) : (
                        <span className="text-[#9CA3AF] text-sm">{row.importPlugin}</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Plugin vs Competitors */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-2 text-[#F5F5F5]">Plugin vs Competitors</h2>
        <p className="text-[#B8B8B8] mb-4 text-sm">Each Interlace plugin compared to existing alternatives</p>
        <div className="grid gap-3">
          {[
            { plugin: 'eslint-plugin-secure-coding', rules: 75, competitor: 'eslint-plugin-security', competitorRules: 17, advantage: 'Full OWASP coverage + LLM messages' },
            { plugin: 'eslint-plugin-pg', rules: 13, competitor: 'No direct alternative', competitorRules: 0, advantage: 'First PostgreSQL-specific security plugin' },
            { plugin: 'eslint-plugin-jwt', rules: 13, competitor: 'No direct alternative', competitorRules: 0, advantage: 'Covers jose, jsonwebtoken, jwt-decode' },
            { plugin: 'eslint-plugin-crypto', rules: 24, competitor: 'eslint-plugin-security (partial)', competitorRules: 3, advantage: '8x more crypto rules' },
            { plugin: 'eslint-plugin-browser-security', rules: 21, competitor: 'No direct alternative', competitorRules: 0, advantage: 'XSS, CSRF, postMessage-specific' },
            { plugin: 'eslint-plugin-mongodb-security', rules: 16, competitor: 'eslint-plugin-security (partial)', competitorRules: 1, advantage: '16x more NoSQL injection rules' },
            { plugin: 'eslint-plugin-vercel-ai-security', rules: 19, competitor: 'No direct alternative', competitorRules: 0, advantage: 'First LLM/AI security plugin' },
            { plugin: 'eslint-plugin-import-next', rules: 56, competitor: 'eslint-plugin-import', competitorRules: 42, advantage: '100x faster no-cycle, 5.5x faster overall' },
          ].map((item, index) => (
            <div
              key={index}
              className="bg-[#1a1f2e] border border-[#2d3548] rounded-xl p-3 sm:p-4 hover:border-violet-500/50 transition-all duration-300"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Plugin info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-violet-400 truncate">{item.plugin}</h3>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">{item.advantage}</p>
                </div>
                
                {/* Comparison bars */}
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#9CA3AF] w-10 text-right">Ours</span>
                    <div className="flex-1 h-2 bg-[#2d3548] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-linear-to-r from-violet-400 to-purple-500 rounded-full"
                        style={{ width: `${Math.min((item.rules / 75) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-violet-400 w-6">{item.rules}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#9CA3AF] w-10 text-right">Alt</span>
                    <div className="flex-1 h-2 bg-[#2d3548] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#6B7280] rounded-full"
                        style={{ width: `${(item.competitorRules / 75) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#9CA3AF] w-6">{item.competitorRules}</span>
                  </div>
                </div>
                
                {/* Competitor name */}
                <div className="sm:w-40 text-right hidden sm:block">
                  <span className="text-xs text-[#6B7280]">vs</span>
                  <p className="text-xs text-[#9CA3AF]">{item.competitor}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Spotlight: Killer Features */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-2 text-[#F5F5F5]">🔥 Spotlight: Killer Features</h2>
        <p className="text-[#B8B8B8] mb-4 text-sm">Unique capabilities you won't find anywhere else</p>
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

      {/* Community Pain Points Solved */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-2 text-[#F5F5F5]">💬 Community Pain Points Solved</h2>
        <p className="text-[#B8B8B8] mb-4 text-sm">Real issues from the community that we address</p>
        <div className="space-y-3">
          {[
            { issue: 'eslint-plugin-import is too slow', source: 'GitHub Issue #2348', link: 'https://github.com/import-js/eslint-plugin-import/issues/2348', solution: 'import-next provides 5.5x faster performance' },
            { issue: 'no-cycle makes CI take forever', source: 'GitHub Issue #1591', link: 'https://github.com/import-js/eslint-plugin-import/issues/1591', solution: 'Our no-cycle implementation is 100x faster' },
            { issue: 'eslint-plugin-security has too many false positives', source: 'GitHub Issues', link: 'https://github.com/eslint-community/eslint-plugin-security/issues', solution: 'secure-coding uses sanitizer-aware detection' },
            { issue: 'No ESLint rules for node-postgres', source: 'Community request', link: 'https://github.com/brianc/node-postgres/discussions', solution: 'eslint-plugin-pg provides 13 rules' },
            { issue: 'ESLint errors are not helpful for AI', source: 'AI tooling feedback', link: 'https://github.com/features/copilot', solution: 'All rules include CWE, OWASP, CVSS metadata' },
          ].map((item, index) => (
            <a
              key={index}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-[#1a1f2e] border border-[#2d3548] rounded-xl p-3 sm:p-4 hover:border-violet-500/50 transition-all duration-300 group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-0.5">
                    <span className="text-red-400 shrink-0">❌</span>
                    <span className="text-[#F5F5F5] font-medium text-sm">"{item.issue}"</span>
                  </div>
                  <p className="text-xs text-[#6B7280] ml-5">{item.source}</p>
                </div>
                <div className="text-[#6B7280] hidden sm:block">→</div>
                <div className="flex-1 flex items-start gap-2">
                  <span className="text-emerald-400 shrink-0">✓</span>
                  <span className="text-[#D1D5DB] text-sm">{item.solution}</span>
                </div>
                <span className="text-violet-400 group-hover:translate-x-1 transition-transform hidden sm:block">↗</span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

// Wrapped in Suspense for Next.js 16 static generation compatibility
export function BenchmarkCharts() {
  return (
    <Suspense fallback={<BenchmarkChartsSkeleton />}>
      <BenchmarkChartsContent />
    </Suspense>
  );
}

// Loading skeleton for BenchmarkCharts
function BenchmarkChartsSkeleton() {
  return (
    <div className="space-y-10 my-8 animate-pulse">
      {/* Hero Stats Skeleton */}
      <section>
        <div className="h-8 bg-[#2d3548] rounded w-48 mx-auto mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#1a1f2e] border border-[#2d3548] rounded-xl p-5 h-24" />
          ))}
        </div>
      </section>
      {/* Chart Skeleton */}
      <section>
        <div className="h-8 bg-[#2d3548] rounded w-64 mb-4" />
        <div className="bg-[#1a1f2e] border border-[#2d3548] rounded-xl p-4 h-64" />
      </section>
    </div>
  );
}

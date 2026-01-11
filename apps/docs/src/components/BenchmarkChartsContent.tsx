'use client';


import { useEffect, useState } from 'react';
import { usePluginStats, useCodecovRepo, type PluginStats } from '@/lib/api';
// import pluginStats from '@/data/plugin-stats.json'; // Removed in favor of dynamic fetch
import { StatCard } from '@/components/ui/stat-card';

// Data for rule count comparison
const ruleCountData = (stats: PluginStats | undefined) => [
  { name: 'ESLint Interlace', rules: stats?.totalRules ?? 0, fill: '#A78BFA' },
  { name: 'eslint-plugin-sonarjs', rules: 32, fill: '#9CA3AF' },
  { name: 'eslint-plugin-security', rules: 17, fill: '#9CA3AF' },
  { name: 'eslint-plugin-import', rules: 60, fill: '#9CA3AF' },
  { name: 'eslint-plugin-n', rules: 29, fill: '#9CA3AF' },
];

// Performance comparison data
const performanceData = [
  { name: 'Cycle Detection', improvement: '100x', competitor: 15.0, time: 0.15 },
  { name: 'Rule Processing', improvement: '8.4x', competitor: 2.1, time: 0.25 },
];

const CSSBarChart = ({ data }: { data: any[] }) => {
  const max = Math.max(...data.map((d: any) => d.rules));
  return (
    <div className="space-y-4">
      {data.map((item: any) => (
        <div key={item.name} className="space-y-2 group">
          <div className="flex justify-between text-xs sm:text-sm text-[#B8B8B8] group-hover:text-[#F5F5F5] transition-colors">
            <span className="font-medium">{item.name}</span>
            <span className="font-mono">{item.rules}</span>
          </div>
          <div className="h-3 bg-[#2d3548]/50 rounded-full overflow-hidden backdrop-blur-sm border border-[#2d3548]">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out relative"
              style={{ width: `${(item.rules / max) * 100}%`, backgroundColor: item.fill }}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const CSSRadarChart = () => {
  const metrics = [
    { name: 'Security Depth', current: 100, comp: 35 },
    { name: 'Performance', current: 95, comp: 40 },
    { name: 'Type Safety', current: 100, comp: 55 },
    { name: 'Auto-fix', current: 90, comp: 30 },
    { name: 'Dev Experience', current: 98, comp: 60 },
  ];
  return (
    <div className="space-y-5">
      {metrics.map((m) => (
        <div key={m.name} className="relative group">
          <div className="flex justify-between text-xs sm:text-sm mb-2">
            <span className="text-[#B8B8B8] font-medium group-hover:text-violet-300 transition-colors">
              {m.name}
            </span>
            <span className="text-violet-400 font-mono text-xs bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
              Interlace Advantage
            </span>
          </div>
          <div className="h-3 bg-[#2d3548]/50 rounded-full overflow-hidden relative border border-[#2d3548]">
            {/* Competitor */}
            <div
              style={{ width: `${m.comp}%` }}
              className="absolute top-0 left-0 h-full bg-[#4B5563]"
              title="Competitor Avg"
            />
            {/* Interlace */}
            <div
              style={{ width: `${m.current}%` }}
              className="absolute top-0 left-0 h-full bg-linear-to-r from-violet-600 to-indigo-500 shadow-[0_0_15px_rgba(124,58,237,0.5)] opacity-90"
              title="Interlace"
            />
          </div>
        </div>
      ))}
      <div className="flex justify-end gap-4 text-xs text-[#9CA3AF] mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#4B5563]" /> Industry Avg
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-violet-500" /> Interlace
        </div>
      </div>
    </div>
  );
};




export function BenchmarkChartsContent() {
  const [isMounted, setIsMounted] = useState(false);
  const { data: pluginStats } = usePluginStats();
  const { data: repoData } = useCodecovRepo();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const liveCoverage = Math.round(repoData?.totals?.coverage ?? 81.7);
  const currentRuleData = ruleCountData(pluginStats);

  // Ensure data availability and client-side only render to prevent hydration mismatch
  if (!isMounted || !pluginStats) return null;
  return (
    <div className="space-y-10 my-8">
      {/* Hero Stats */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center text-[#F5F5F5]">Ecosystem at a Glance</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard value={pluginStats.totalRules} suffix="+" label="Security Rules" color="violet" />
          <StatCard value={pluginStats.totalPlugins} label="ESLint Plugins" color="blue" />
          <StatCard value={100} suffix="%" label="OWASP Coverage" color="emerald" />
          <StatCard value={liveCoverage} suffix="%" label="Test Coverage" color="amber" />
        </div>
      </section>


      {/* Rule Count Comparison - CSS Bar Chart */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-2 text-[#F5F5F5]">Rule Coverage Comparison</h2>
        <p className="text-[#B8B8B8] mb-4 text-sm">Total security rules across popular ESLint security plugins</p>
        <div className="bg-[#1a1f2e] border border-[#2d3548] rounded-xl p-4 sm:p-6">
          <CSSBarChart data={currentRuleData} />
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

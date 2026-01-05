'use client';

import { useEffect, useRef, useState } from 'react';
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
  { name: 'Interlace ESLint', rules: 216, fill: '#8B5CF6' },
  { name: 'eslint-plugin-sonarjs', rules: 32, fill: '#6B7280' },
  { name: 'eslint-plugin-security', rules: 17, fill: '#6B7280' },
  { name: 'eslint-plugin-n', rules: 29, fill: '#6B7280' },
];

// Data for feature comparison radar
const featureData = [
  { feature: 'Rules', interlace: 100, security: 8, sonarjs: 15 },
  { feature: 'OWASP', interlace: 100, security: 40, sonarjs: 25 },
  { feature: 'CWE', interlace: 100, security: 0, sonarjs: 30 },
  { feature: 'CVSS', interlace: 100, security: 0, sonarjs: 0 },
  { feature: 'LLM-Ready', interlace: 100, security: 10, sonarjs: 10 },
  { feature: 'Compliance', interlace: 100, security: 0, sonarjs: 0 },
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

// Stat card with animation
function StatCard({ value, label, suffix = '', color = 'purple' }: { value: number; label: string; suffix?: string; color?: string }) {
  const colorClasses = {
    purple: 'from-purple-500 to-violet-600',
    green: 'from-emerald-500 to-green-600',
    blue: 'from-blue-500 to-cyan-600',
    amber: 'from-amber-500 to-orange-600',
  };

  return (
    <div className="relative group">
      <div className={`absolute inset-0 bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses]} rounded-2xl blur-xl opacity-25 group-hover:opacity-40 transition-opacity duration-500`} />
      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 text-center hover:border-purple-500/50 transition-all duration-300 hover:translate-y-[-2px]">
        <div className={`text-4xl md:text-5xl font-bold bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses]} bg-clip-text text-transparent`}>
          <AnimatedCounter end={value} suffix={suffix} />
        </div>
        <div className="text-gray-400 mt-2 text-sm">{label}</div>
      </div>
    </div>
  );
}

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="text-white font-semibold">{label}</p>
        {payload.map((item, index) => (
          <p key={index} className="text-gray-300 text-sm">
            {item.dataKey}: <span className="text-purple-400 font-bold">{item.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function BenchmarkCharts() {
  const [visiblePlugins, setVisiblePlugins] = useState({
    interlace: true,
    security: true,
    sonarjs: true,
    n: false,
    importPlugin: false,
  });

  const plugins = [
    { id: 'interlace' as const, label: 'Interlace ESLint', color: '#8B5CF6', dataKey: 'interlace' },
    { id: 'security' as const, label: 'eslint-plugin-security', color: '#EF4444', dataKey: 'security' },
    { id: 'sonarjs' as const, label: 'eslint-plugin-sonarjs', color: '#F59E0B', dataKey: 'sonarjs' },
    { id: 'n' as const, label: 'eslint-plugin-n', color: '#10B981', dataKey: 'n' },
    { id: 'importPlugin' as const, label: 'eslint-plugin-import', color: '#3B82F6', dataKey: 'importPlugin' },
  ];

  // Extended feature data with more plugins
  const extendedFeatureData = [
    { feature: 'Rules', interlace: 100, security: 8, sonarjs: 15, n: 13, importPlugin: 19 },
    { feature: 'OWASP', interlace: 100, security: 40, sonarjs: 25, n: 0, importPlugin: 0 },
    { feature: 'CWE', interlace: 100, security: 0, sonarjs: 30, n: 0, importPlugin: 0 },
    { feature: 'CVSS', interlace: 100, security: 0, sonarjs: 0, n: 0, importPlugin: 0 },
    { feature: 'LLM-Ready', interlace: 100, security: 10, sonarjs: 10, n: 5, importPlugin: 5 },
    { feature: 'Compliance', interlace: 100, security: 0, sonarjs: 0, n: 0, importPlugin: 0 },
  ];

  const togglePlugin = (id: keyof typeof visiblePlugins) => {
    setVisiblePlugins(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-12 my-8">
      {/* Hero Stats */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-center">Ecosystem at a Glance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard value={216} suffix="+" label="Security Rules" color="purple" />
          <StatCard value={11} label="ESLint Plugins" color="blue" />
          <StatCard value={100} suffix="%" label="OWASP Coverage" color="green" />
          <StatCard value={90} suffix="%+" label="Test Coverage" color="amber" />
        </div>
      </section>

      {/* Rule Count Comparison */}
      <section>
        <h2 className="text-2xl font-bold mb-2">Rule Coverage Comparison</h2>
        <p className="text-gray-400 mb-4">Total security rules across popular ESLint security plugins</p>
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-4 overflow-hidden">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ruleCountData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={120} tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="rules" radius={[0, 8, 8, 0]} animationDuration={1500}>
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
        <h2 className="text-2xl font-bold mb-2">Feature Coverage Radar</h2>
        <p className="text-gray-400 mb-4">Toggle plugins to compare across key security dimensions</p>
        
        {/* Plugin Toggles */}
        <div className="flex flex-wrap gap-2 mb-4">
          {plugins.map((plugin) => (
            <button 
              key={plugin.id}
              onClick={() => togglePlugin(plugin.id)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all text-sm ${
                visiblePlugins[plugin.id] 
                  ? 'bg-gray-800 border-purple-500/50 shadow-sm shadow-purple-500/20' 
                  : 'bg-gray-900 border-gray-700 opacity-60'
              }`}
            >
              <span 
                className={`w-2.5 h-2.5 rounded-full transition-opacity ${visiblePlugins[plugin.id] ? 'opacity-100' : 'opacity-40'}`}
                style={{ backgroundColor: plugin.color }}
              />
              <span className="text-gray-300 text-xs">{plugin.label}</span>
            </button>
          ))}
        </div>
        
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-4 overflow-hidden">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={extendedFeatureData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="feature" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#6B7280" tick={{ fontSize: 10 }} />
              {plugins.map((plugin) => (
                visiblePlugins[plugin.id] && (
                  <Radar
                    key={plugin.id}
                    name={plugin.label}
                    dataKey={plugin.dataKey}
                    stroke={plugin.color}
                    fill={plugin.color}
                    fillOpacity={plugin.id === 'interlace' ? 0.5 : 0.15}
                    animationDuration={800}
                  />
                )
              ))}
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Performance Comparison */}
      <section>
        <h2 className="text-2xl font-bold mb-2">Performance Improvements</h2>
        <p className="text-gray-400 mb-6">Measured speed improvements over alternatives</p>
        <div className="grid md:grid-cols-2 gap-6">
          {performanceData.map((item) => (
            <div
              key={item.name}
              className="relative bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300 group"
            >
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold rounded-full">
                  {item.improvement} faster
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-4">{item.name}</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Competitor</span>
                    <span className="text-red-400">{item.competitor}s</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Interlace</span>
                    <span className="text-emerald-400">{item.time}s</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-1000 ease-out"
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
        <h2 className="text-2xl font-bold mb-2">Feature Matrix</h2>
        <p className="text-gray-400 mb-6">Detailed capability comparison</p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-4 px-4 text-gray-300">Feature</th>
                <th className="text-center py-4 px-4 text-purple-400">Interlace</th>
                <th className="text-center py-4 px-4 text-gray-400">eslint-plugin-security</th>
                <th className="text-center py-4 px-4 text-gray-400">eslint-plugin-sonarjs</th>
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
                <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 px-4 text-gray-300">{row.feature}</td>
                  <td className="py-3 px-4 text-center">
                    {row.interlace === true ? (
                      <span className="text-emerald-400 text-xl">✓</span>
                    ) : row.interlace === false ? (
                      <span className="text-red-400 text-xl">✗</span>
                    ) : (
                      <span className="text-purple-400 font-semibold">{row.interlace}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.security === true ? (
                      <span className="text-emerald-400 text-xl">✓</span>
                    ) : row.security === false ? (
                      <span className="text-red-400 text-xl">✗</span>
                    ) : row.security === 'partial' ? (
                      <span className="text-amber-400">⚠️</span>
                    ) : (
                      <span className="text-gray-400">{row.security}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.sonarjs === true ? (
                      <span className="text-emerald-400 text-xl">✓</span>
                    ) : row.sonarjs === false ? (
                      <span className="text-red-400 text-xl">✗</span>
                    ) : row.sonarjs === 'partial' ? (
                      <span className="text-amber-400">⚠️</span>
                    ) : (
                      <span className="text-gray-400">{row.sonarjs}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Plugin vs Competitors */}
      <section>
        <h2 className="text-2xl font-bold mb-2">Plugin vs Competitors</h2>
        <p className="text-gray-400 mb-6">Each Interlace plugin compared to existing alternatives</p>
        <div className="grid gap-4">
          {[
            { 
              plugin: 'eslint-plugin-secure-coding', 
              rules: 75, 
              competitor: 'eslint-plugin-security', 
              competitorRules: 17,
              advantage: 'Full OWASP coverage + LLM messages'
            },
            { 
              plugin: 'eslint-plugin-pg', 
              rules: 13, 
              competitor: 'No direct alternative', 
              competitorRules: 0,
              advantage: 'First PostgreSQL-specific security plugin'
            },
            { 
              plugin: 'eslint-plugin-jwt', 
              rules: 13, 
              competitor: 'No direct alternative', 
              competitorRules: 0,
              advantage: 'Covers jose, jsonwebtoken, jwt-decode'
            },
            { 
              plugin: 'eslint-plugin-crypto', 
              rules: 24, 
              competitor: 'eslint-plugin-security (partial)', 
              competitorRules: 3,
              advantage: '8x more crypto rules'
            },
            { 
              plugin: 'eslint-plugin-browser-security', 
              rules: 21, 
              competitor: 'No direct alternative', 
              competitorRules: 0,
              advantage: 'XSS, CSRF, postMessage-specific'
            },
            { 
              plugin: 'eslint-plugin-mongodb-security', 
              rules: 16, 
              competitor: 'eslint-plugin-security (partial)', 
              competitorRules: 1,
              advantage: '16x more NoSQL injection rules'
            },
            { 
              plugin: 'eslint-plugin-vercel-ai-security', 
              rules: 19, 
              competitor: 'No direct alternative', 
              competitorRules: 0,
              advantage: 'First LLM/AI security plugin'
            },
            { 
              plugin: 'eslint-plugin-import-next', 
              rules: 56, 
              competitor: 'eslint-plugin-import', 
              competitorRules: 42,
              advantage: '100x faster no-cycle, 5.5x faster overall'
            },
          ].map((item, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4 md:p-6 hover:border-purple-500/50 transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Plugin info */}
                <div className="flex-1">
                  <h3 className="text-base md:text-lg font-semibold text-purple-400">{item.plugin}</h3>
                  <p className="text-sm text-gray-400 mt-1">{item.advantage}</p>
                </div>
                
                {/* Comparison bars */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16 text-right">Ours</span>
                    <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full"
                        style={{ width: `${Math.min((item.rules / 75) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-purple-400 w-8">{item.rules}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16 text-right">Alt</span>
                    <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gray-500 rounded-full"
                        style={{ width: `${(item.competitorRules / 75) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-400 w-8">{item.competitorRules}</span>
                  </div>
                </div>
                
                {/* Competitor name */}
                <div className="md:w-48 text-right">
                  <span className="text-xs text-gray-500">vs</span>
                  <p className="text-sm text-gray-400">{item.competitor}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Spotlight: Killer Features */}
      <section>
        <h2 className="text-2xl font-bold mb-2">🔥 Spotlight: Killer Features</h2>
        <p className="text-gray-400 mb-6">Unique capabilities you won't find anywhere else</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: '🤖',
              title: 'LLM-Optimized Messages',
              description: 'Every error includes structured metadata for AI assistants to auto-fix issues',
              plugin: 'All plugins',
            },
            {
              icon: '🔒',
              title: 'PostgreSQL COPY FROM',
              description: 'Detects file read vulnerabilities via COPY FROM - first of its kind',
              plugin: 'eslint-plugin-pg',
            },
            {
              icon: '⚡',
              title: '100x Faster no-cycle',
              description: 'Optimized cycle detection that runs in milliseconds, not minutes',
              plugin: 'eslint-plugin-import-next',
            },
            {
              icon: '🛡️',
              title: 'JWT Algorithm Confusion',
              description: 'Catches CVE-2015-2951 algorithm confusion attacks',
              plugin: 'eslint-plugin-jwt',
            },
            {
              icon: '🧠',
              title: 'AI Tool Misuse Detection',
              description: 'Prevents prompt injection and tool result manipulation',
              plugin: 'eslint-plugin-vercel-ai-security',
            },
            {
              icon: '📊',
              title: 'NoSQL Query Injection',
              description: 'Detects $where, $regex, and aggregation injection patterns',
              plugin: 'eslint-plugin-mongodb-security',
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="group relative bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-5 hover:border-purple-500/50 transition-all duration-300 hover:translate-y-[-2px]"
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400 mb-3">{feature.description}</p>
              <span className="text-xs text-purple-400 font-medium">{feature.plugin}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Community Pain Points Solved */}
      <section>
        <h2 className="text-2xl font-bold mb-2">💬 Community Pain Points Solved</h2>
        <p className="text-gray-400 mb-6">Real issues from the community that we address</p>
        <div className="space-y-4">
          {[
            {
              issue: 'eslint-plugin-import is too slow',
              source: 'GitHub Issue #2348',
              link: 'https://github.com/import-js/eslint-plugin-import/issues/2348',
              solution: 'import-next provides 5.5x faster performance with optimized algorithms',
            },
            {
              issue: 'no-cycle makes CI take forever',
              source: 'GitHub Issue #1591',
              link: 'https://github.com/import-js/eslint-plugin-import/issues/1591',
              solution: 'Our no-cycle implementation is 100x faster using a different algorithm',
            },
            {
              issue: 'eslint-plugin-security has too many false positives',
              source: 'GitHub Issues',
              link: 'https://github.com/eslint-community/eslint-plugin-security/issues',
              solution: 'secure-coding uses sanitizer-aware detection with lower FP rates',
            },
            {
              issue: 'No ESLint rules for node-postgres',
              source: 'Community request',
              link: 'https://github.com/brianc/node-postgres/discussions',
              solution: 'eslint-plugin-pg provides 13 rules specifically for node-postgres',
            },
            {
              issue: 'ESLint errors are not helpful for AI assistants',
              source: 'AI tooling feedback',
              link: 'https://github.com/features/copilot',
              solution: 'All rules include CWE, OWASP, CVSS metadata + actionable fix suggestions',
            },
          ].map((item, index) => (
            <a
              key={index}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4 hover:border-purple-500/50 transition-all duration-300 group"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-red-400">❌</span>
                    <span className="text-white font-medium">"{item.issue}"</span>
                  </div>
                  <p className="text-xs text-gray-500">{item.source}</p>
                </div>
                <div className="text-gray-400">→</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span className="text-gray-300 text-sm">{item.solution}</span>
                  </div>
                </div>
                <span className="text-purple-400 group-hover:translate-x-1 transition-transform">↗</span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

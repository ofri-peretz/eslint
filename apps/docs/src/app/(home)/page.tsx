'use client';

import Link from 'next/link';
import Image from 'next/image';
import { 
  Shield, 
  Zap, 
  Lock, 
  Code, 
  ArrowRight, 
  Terminal, 
  CheckCircle2, 
  Book, 
  FileCode, 
  BarChart3, 
  Cpu, 
  Database, 
  Layout as LayoutIcon, 
  Activity,
  Globe 
} from 'lucide-react';
const LLMWorkflowDemo = dynamic(() => import('@/components/LLMWorkflowDemo').then(m => m.LLMWorkflowDemo), { 
  ssr: false,
  loading: () => <div className="w-full max-w-6xl mx-auto min-h-[500px] animate-pulse bg-fd-card/10 rounded-3xl" />
});
const NumberTicker = dynamic(() => import('@/components/ui/number-ticker').then(m => m.NumberTicker), { ssr: false });
const FlickeringGrid = dynamic(() => import('@/components/ui/flickering-grid').then(m => m.FlickeringGrid), { ssr: false });
const PluginCarousel = dynamic(() => import('@/components/ui/plugin-carousel').then(m => m.PluginCarousel), { ssr: false });
const ShimmerButton = dynamic(() => import('@/components/ui/shimmer-button').then(m => m.ShimmerButton), { ssr: false });
const BorderBeam = dynamic(() => import('@/components/ui/border-beam').then(m => m.BorderBeam), { ssr: false });
const ESLintEcosystemWithLabels = dynamic(() => import('@/components/ESLintEcosystemBeam').then(m => m.ESLintEcosystemWithLabels), { 
  ssr: false,
  loading: () => <div className="h-64 w-full bg-fd-card/10 rounded-xl animate-pulse" />
});
const RelatedArticles = dynamic(() => import('@/components/DevToArticles').then(m => m.RelatedArticles), { ssr: false });
const PluginCard = dynamic(() => import('@/components/PluginCard').then(m => m.PluginCard), { ssr: false });
const PluginCards = dynamic(() => import('@/components/PluginCard').then(m => m.PluginCards), { ssr: false });
import { CTACard, CTAGrid } from '@/components/ui/cta';
import dynamic from 'next/dynamic';
import { pluginLogos } from '@/components/TechLogos';
const EcosystemStats = dynamic(() => import('@/components/EcosystemStats').then(m => m.EcosystemStats), { 
  ssr: false,
  loading: () => <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4 h-[180px] animate-pulse bg-fd-card/10 rounded-2xl" />
});

// Import plugin data from generated JSON (synced via GitHub Action)
import pluginData from '@/data/plugin-stats.json';

// Filter to show main plugins on homepage (subset of all 15 plugins)
const plugins = pluginData.plugins
  .filter(p => 
    // Show security, framework, and main architecture plugins
    p.category === 'security' || 
    p.category === 'framework' ||
    p.name === 'eslint-plugin-import-next'
  )
  .slice(0, 11)
  .map(p => ({
    name: p.name,
    rules: p.rules,
    description: p.description,
    category: p.category as 'security' | 'framework' | 'architecture',
  }));

const totalRules = pluginData.totalRules;
const totalPlugins = pluginData.totalPlugins;

const stats = [
  { label: 'Security Rules', value: totalRules, icon: Shield, suffix: '+' },
  { label: 'Specialized Plugins', value: totalPlugins, icon: Code, suffix: '' },
  { label: 'OWASP Coverage', value: 100, icon: Lock, suffix: '%' },
  { label: 'LLM-Optimized', value: 100, icon: Zap, suffix: '%' },
];

const pluginNames = plugins.map((p) => p.name);

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* Hero Section with Flickering Grid */}
      <section className="relative px-6 py-20 text-center overflow-hidden">
        <FlickeringGrid
          className="absolute inset-0 z-0"
          squareSize={4}
          gridGap={6}
          color="rgb(139, 92, 246)"
          maxOpacity={0.15}
          flickerChance={0.1}
        />
        
        <div className="absolute inset-0 bg-linear-to-b from-fd-background/80 via-fd-background/60 to-fd-background z-1" />
        
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex items-center justify-center gap-3 mb-6 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20" />
              <Image src="/eslint-logo.svg" alt="ESLint" width={64} height={64} className="relative" />
            </div>
          </div>
          
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl mb-6">
            <span className="bg-linear-to-r from-purple-400 via-violet-500 to-purple-600 bg-clip-text text-transparent">
              Security for the AI Era
            </span>
          </h1>
          
          <p className="mt-4 text-xl leading-8 text-fd-muted-foreground max-w-2xl mx-auto">
            The first <strong className="text-fd-foreground">SOC2 & OWASP-ready</strong> ESLint ecosystem designed for humans and LLMs. 
            Stop hallucinations with structured error metadata.
          </p>
          
          {/* Quick Install */}
          <div className="mt-10 rounded-2xl bg-linear-to-b from-white/10 to-transparent p-px max-w-xl mx-auto backdrop-blur-md">
            <div className="rounded-2xl bg-fd-card/40 border border-white/5 relative overflow-hidden">
              <BorderBeam size={250} duration={12} colorFrom="#8b5cf6" colorTo="#a855f7" delay={0} />
              <div className="px-6 py-4 flex items-center justify-between gap-4 overflow-x-auto">
                <div className="flex items-center gap-3 text-sm text-fd-muted-foreground font-mono whitespace-nowrap min-w-0">
                  <span className="text-purple-400 font-bold shrink-0">$</span>
                  <span className="shrink-0">npm install</span>
                  <PluginCarousel 
                    plugins={pluginNames}
                    interval={3500}
                    className="text-fd-foreground font-semibold"
                  />
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/docs">
              <ShimmerButton className="shadow-2xl shadow-purple-500/20">
                <span className="flex items-center gap-2 text-base font-semibold">
                  Get Started
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </ShimmerButton>
            </Link>
            <Link 
              href="/docs/benchmarks"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all duration-300 shadow-lg shadow-emerald-500/10"
            >
              See Benchmarks
            </Link>
          </div>
        </div>
      </section>

      {/* Dynamic Stats Section */}
      <section className="py-12 px-6 border-y border-fd-border/50 bg-fd-card/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <EcosystemStats />
        </div>
      </section>

      {/* Value Props */}
      <section className="py-24 px-6 bg-linear-to-b from-fd-background to-fd-accent/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                title: 'SOC2 & ISO Compliance',
                desc: 'Automate your security controls. Every rule maps to specific compliance criteria, generating audit-ready evidence automatically.',
                icon: Shield
              },
              {
                title: 'OWASP Top 10 Coverage',
                desc: 'Stop vulnerabilities at the source. From Injection to Broken Access Control, we cover 100% of the OWASP Top 10.',
                icon: Lock
              },
              {
                title: 'Agentic Workflow Ready',
                desc: 'Designed for the age of AI. Our error messages speak the language of Agents, enabling autonomous fix generation.',
                icon: Zap
              }
            ].map((feature, i) => (
              <div key={i} className="flex flex-col gap-4 p-6 rounded-2xl bg-fd-card border border-fd-border/50 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300">
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <feature.icon className="size-6 text-purple-500" />
                </div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-fd-muted-foreground leading-relaxed">{feature.desc}</p>
                <ul className="mt-auto space-y-2">
                  <li className="flex items-center gap-2 text-sm text-fd-muted-foreground">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span>Audit logs included</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-fd-muted-foreground">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span>Zero-config setup</span>
                  </li>
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions Navigator */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-purple-500/5 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Choose Your Security Path</h2>
            <p className="text-fd-muted-foreground text-lg max-w-2xl mx-auto">
              Targeted security rules for every layer of your stack. From AI assistants to database integrity.
            </p>
          </div>

          <CTAGrid columns={3}>
            <CTACard
              href="/docs"
              title="Getting Started"
              description="Supercharge your ESLint config in 2 minutes with our zero-config presets."
              icon={<Book className="size-8" />}
              gradient="purple"
            />
            <CTACard
              href="/docs/secure-coding"
              title="Web & Mobile Security"
              description="Complete protection against OWASP Top 10 vulnerabilities like XSS and Injection."
              icon={<Shield className="size-8" />}
              gradient="emerald"
            />
            <CTACard
              href="/docs/vercel-ai-security"
              title="AI & LLM Safety"
              description="Hardening the Vercel AI SDK against prompt injections and data leakage."
              icon={<Cpu className="size-8" />}
              gradient="blue"
            />
            <CTACard
              href="/docs/pg"
              title="Database Integrity"
              description="Battle-tested PostgreSQL rules to prevent SQLi and enforce best practices."
              icon={<Database className="size-8" />}
              gradient="amber"
            />
            <CTACard
              href="/docs/examples"
              title="Interactive Examples"
              description="Explore real-world vulnerabilities and how our rules catch them instantly."
              icon={<FileCode className="size-8" />}
              gradient="purple"
            />
            <CTACard
              href="/docs/benchmarks"
              title="Reliability & Speed"
              description="Low latency, 100% coverage. See the verified benchmarks for our ecosystem."
              icon={<BarChart3 className="size-8" />}
              gradient="emerald"
            />
          </CTAGrid>
        </div>
      </section>

      {/* Interactive LLM Demo */}
      <section className="py-24 px-6">
        <LLMWorkflowDemo />
      </section>

      {/* Ecosystem Visualization */}
      <section className="py-24 px-6 bg-fd-card/50 border-y border-fd-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Complete Ecosystem Integration</h2>
            <p className="text-fd-muted-foreground text-lg max-w-2xl mx-auto">
              From your IDE to your CI/CD pipeline, Interlace protects your entire development lifecycle.
            </p>
          </div>
          <div className="flex justify-center transform scale-90 sm:scale-100">
            <ESLintEcosystemWithLabels />
          </div>
        </div>
      </section>

      {/* Latest Updates */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <RelatedArticles plugin="secure-coding" limit={3} />
        </div>
      </section>

      {/* Plugins Grid */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Defense in Depth</h2>
          <p className="text-fd-muted-foreground text-lg text-center mb-12 max-w-2xl mx-auto">
            {plugins.length} specialized plugins covering security, frameworks, and architecture
          </p>
          
          {/* Security Plugins */}
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Shield className="size-5 text-purple-500" />
            Security Plugins
          </h3>
          <PluginCards columns={3}>
            {plugins.filter(p => p.category === 'security').map((plugin) => (
              <PluginCard
                key={plugin.name}
                title={plugin.name.replace('eslint-plugin-', '')}
                rules={plugin.rules}
                description={plugin.description}
                href={`/docs/${plugin.name.replace('eslint-plugin-', '')}`}
                logo={pluginLogos[plugin.name]}
                category="security"
              />
            ))}
          </PluginCards>

          {/* Framework Plugins */}
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 mt-12">
            <Code className="size-5 text-cyan-500" />
            Framework Plugins
          </h3>
          <PluginCards columns={3}>
            {plugins.filter(p => p.category === 'framework').map((plugin) => (
              <PluginCard
                key={plugin.name}
                title={plugin.name.replace('eslint-plugin-', '')}
                rules={plugin.rules}
                description={plugin.description}
                href={`/docs/${plugin.name.replace('eslint-plugin-', '')}`}
                logo={pluginLogos[plugin.name]}
                category="framework"
              />
            ))}
          </PluginCards>

          {/* Architecture Plugins */}
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 mt-12">
            <Terminal className="size-5 text-emerald-500" />
            Architecture Plugins
          </h3>
          <PluginCards columns={3}>
            {plugins.filter(p => p.category === 'architecture').map((plugin) => (
              <PluginCard
                key={plugin.name}
                title={plugin.name.replace('eslint-plugin-', '')}
                rules={plugin.rules}
                description={plugin.description}
                href={`/docs/${plugin.name.replace('eslint-plugin-', '')}`}
                logo={pluginLogos[plugin.name]}
                category="architecture"
              />
            ))}
          </PluginCards>
        </div>
      </section>

      {/* Additional Resources */}
      <section className="py-24 px-6 bg-fd-accent/5 border-t border-fd-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <Link href="/docs/coverage" className="group">
              <h4 className="font-bold mb-2 flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                <Activity className="size-4" />
                Coverage Report
              </h4>
              <p className="text-sm text-fd-muted-foreground">View detailed rule coverage of OWASP and CWE standards.</p>
            </Link>
            <Link href="/docs/concepts" className="group">
              <h4 className="font-bold mb-2 flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                <Zap className="size-4" />
                Core Concepts
              </h4>
              <p className="text-sm text-fd-muted-foreground">Learn about the architecture and philosophy behind Interlace.</p>
            </Link>
            <Link href="/docs/secure-coding/changelog" className="group">
              <h4 className="font-bold mb-2 flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                <Terminal className="size-4" />
                Changelog
              </h4>
              <p className="text-sm text-fd-muted-foreground">Stay up to date with the latest rules and improvements.</p>
            </Link>
             <a href="https://github.com/ofri-peretz/eslint" className="group">
              <h4 className="font-bold mb-2 flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                <Globe className="size-4" />
                Community
              </h4>
              <p className="text-sm text-fd-muted-foreground">Join the discussion on GitHub and help us build a safer web.</p>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-fd-border bg-fd-card">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-sm text-fd-muted-foreground">
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-fd-foreground">ESLint Interlace Ecosystem</span>
            <span>© {new Date().getFullYear()} Ofri Peretz. MIT Licensed.</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="https://github.com/ofri-peretz/eslint" className="hover:text-purple-400 transition-colors">GitHub</a>
            <a href="https://www.npmjs.com/~ofri-peretz" className="hover:text-purple-400 transition-colors">NPM</a>
            <a href="https://ofriperetz.dev" className="hover:text-purple-400 transition-colors">Portfolio</a>
            <Link href="/docs/privacy" className="hover:text-purple-400 transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}


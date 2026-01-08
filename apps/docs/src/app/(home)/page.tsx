'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Shield, Zap, Lock, Code, ArrowRight, Terminal, CheckCircle2 } from 'lucide-react';
import { FlickeringGrid } from '@/components/ui/flickering-grid';
import { PluginCarousel } from '@/components/ui/plugin-carousel';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { LLMWorkflowDemo } from '@/components/LLMWorkflowDemo';
import { ESLintEcosystemWithLabels } from '@/components/ESLintEcosystemBeam';
import { pluginLogos } from '@/components/TechLogos';
import { PluginCard, PluginCards } from '@/components/PluginCard';

const plugins = [
  // Security Plugins
  { name: 'eslint-plugin-secure-coding', rules: 75, description: 'Core OWASP Top 10 Web + Mobile coverage', category: 'security' as const },
  { name: 'eslint-plugin-pg', rules: 13, description: 'PostgreSQL SQL injection prevention', category: 'security' as const },
  { name: 'eslint-plugin-jwt', rules: 13, description: 'JWT security best practices', category: 'security' as const },
  { name: 'eslint-plugin-crypto', rules: 24, description: 'Cryptographic security', category: 'security' as const },
  { name: 'eslint-plugin-browser-security', rules: 21, description: 'XSS and client-side security', category: 'security' as const },
  { name: 'eslint-plugin-mongodb-security', rules: 16, description: 'NoSQL injection prevention', category: 'security' as const },
  { name: 'eslint-plugin-vercel-ai-security', rules: 19, description: 'AI/LLM security for Vercel AI SDK', category: 'security' as const },
  // Framework Plugins
  { name: 'eslint-plugin-express-security', rules: 9, description: 'Express.js middleware security', category: 'framework' as const },
  { name: 'eslint-plugin-nestjs-security', rules: 5, description: 'NestJS guards and validation', category: 'framework' as const },
  { name: 'eslint-plugin-lambda-security', rules: 5, description: 'AWS Lambda security', category: 'framework' as const },
  // Architecture Plugins
  { name: 'eslint-plugin-import-next', rules: 56, description: 'Import analysis and architecture enforcement', category: 'architecture' as const },
];

const stats = [
  { label: 'Security Rules', value: 216, icon: Shield, suffix: '+' },
  { label: 'Specialized Plugins', value: plugins.length, icon: Code, suffix: '' },
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
              <div className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm text-fd-muted-foreground font-mono">
                  <span className="text-purple-400 font-bold">$</span>
                  <span>npm install</span>
                  <PluginCarousel 
                    plugins={pluginNames}
                    interval={3500}
                    className="text-fd-foreground font-semibold"
                  />
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
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
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center group relative">
              <div className="absolute inset-0 bg-purple-500/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="text-4xl sm:text-5xl font-bold tracking-tight text-fd-foreground mb-2 tabular-nums">
                  <NumberTicker value={stat.value} />
                  <span className="text-purple-500">{stat.suffix}</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-fd-muted-foreground font-medium uppercase tracking-wide">
                  <stat.icon className="size-4 text-purple-500" />
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
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

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-fd-border bg-fd-card">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-sm text-fd-muted-foreground">
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-fd-foreground">Interlace ESLint Ecosystem</span>
            <span>© {new Date().getFullYear()} Ofri Peretz. MIT Licensed.</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="https://github.com/ofri-peretz/eslint" className="hover:text-purple-400 transition-colors">GitHub</a>
            <a href="https://www.npmjs.com/~ofri-peretz" className="hover:text-purple-400 transition-colors">NPM</a>
            <a href="https://ofriperetz.dev" className="hover:text-purple-400 transition-colors">Portfolio</a>
            <a href="/docs/privacy" className="hover:text-purple-400 transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </main>
  );
}


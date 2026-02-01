import Link from 'next/link';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { 
  ShieldCheck, 
  Code2, 
  ArrowRight,
  Zap,
  BookOpen,
  Package,
  FileCode2,
  Globe,
  ChevronRight,
  Terminal,
  Lock,
  Bug,
  Database,
  Import,
} from 'lucide-react';
import { DotPattern } from '@/components/ui/dot-pattern';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { Marquee } from '@/components/ui/marquee';
import { cn } from '@/lib/utils';

// Plugin stats
const stats = {
  plugins: 19,
  rules: 150,
  securityPlugins: 11,
  qualityPlugins: 8,
};

// Security plugins for marquee
const securityPlugins = [
  { name: 'browser-security', icon: Globe, desc: 'XSS & DOM protection' },
  { name: 'jwt', icon: Lock, desc: 'Token security' },
  { name: 'express-security', icon: ShieldCheck, desc: 'Express hardening' },
  { name: 'mongodb-security', icon: Bug, desc: 'NoSQL injection' },
  { name: 'node-security', icon: Terminal, desc: 'Node.js security' },
  { name: 'pg', icon: Database, desc: 'PostgreSQL security' },
];

const qualityPlugins = [
  { name: 'conventions', icon: FileCode2, desc: 'Team standards' },
  { name: 'modularity', icon: Package, desc: 'Clean architecture' },
  { name: 'reliability', icon: Zap, desc: 'Error prevention' },
  { name: 'modernization', icon: Code2, desc: 'Modern patterns' },
  { name: 'import-next', icon: Import, desc: 'Next.js imports' },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Dot Pattern Background */}
        <DotPattern
          className="absolute inset-0 -z-10 opacity-40 dark:opacity-20"
          width={24}
          height={24}
          cr={1.5}
        />
        
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/40 via-orange-500/30 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 -z-10">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/30 via-pink-500/20 to-transparent rounded-full blur-3xl" />
        </div>

        {/* Hero Content */}
        <div className="container px-4 py-20 text-center max-w-5xl mx-auto">
          {/* Badge */}
          <AnimatedGradientText className="mb-8 inline-flex">
            <span className="inline-flex items-center gap-2">
              <span className="text-lg">🔒</span>
              <hr className="h-4 w-px bg-fd-muted-foreground/30" />
              <span className="animate-gradient bg-gradient-to-r from-purple-400 via-violet-500 to-purple-400 bg-[length:200%_100%] bg-clip-text text-transparent font-medium">
                Enterprise-Grade Security
              </span>
              <ChevronRight className="size-4 text-fd-muted-foreground" />
            </span>
          </AnimatedGradientText>

          {/* Main Headline - Fumadocs style */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
            <span className="text-fd-foreground">Secure your code,</span>
            <br />
            <span className="bg-gradient-to-r from-purple-500 via-violet-500 to-purple-600 bg-clip-text text-transparent">
              your style.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-fd-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            ESLint Interlace is a comprehensive <span className="text-fd-foreground font-semibold">security & quality</span> plugin ecosystem. 
            Built for modern JavaScript, designed for teams who care about code integrity.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/docs/getting-started">
              <ShimmerButton
                className="shadow-2xl"
                shimmerColor="#c084fc"
                shimmerSize="0.15em"
                background="linear-gradient(135deg, #8b5cf6, #7c3aed)"
              >
                <span className="flex items-center gap-2 px-6 py-2 text-white font-semibold text-lg">
                  Get Started
                  <ArrowRight className="size-5" />
                </span>
              </ShimmerButton>
            </Link>
            
            <Link
              href="https://github.com/ofri-peretz/eslint"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-fd-border bg-fd-background/50 backdrop-blur px-6 py-3 font-semibold transition-all hover:bg-fd-accent hover:border-fd-accent-foreground/20"
            >
              <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              GitHub
            </Link>
          </div>
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="relative border-y border-fd-border bg-fd-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <StatCard value={stats.plugins} label="Plugins" />
            <StatCard value={stats.rules} label="Rules" suffix="+" />
            <StatCard value={stats.securityPlugins} label="Security" />
            <StatCard value={stats.qualityPlugins} label="Quality" />
          </div>
        </div>
      </section>

      {/* ===== DOCS PREVIEW - Visual Demo ===== */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            See it in action
          </h2>
          <p className="text-fd-muted-foreground max-w-xl mx-auto">
            Clean configuration, powerful protection. Works with any ESLint 9+ project.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="relative rounded-2xl border border-fd-border bg-fd-card overflow-hidden shadow-2xl">
            <BorderBeam size={400} duration={15} colorFrom="#a855f7" colorTo="#7c3aed" />
            
            {/* Terminal Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-fd-border bg-fd-background/50">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-red-500/80" />
                <div className="size-3 rounded-full bg-yellow-500/80" />
                <div className="size-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-fd-muted-foreground font-mono ml-2">eslint.config.js</span>
            </div>
            
            {/* Code Content */}
            <pre className="p-6 text-sm md:text-base overflow-x-auto">
              <code className="font-mono">
                <span className="text-purple-400">import</span> <span className="text-yellow-400">browserSecurity</span> <span className="text-purple-400">from</span> <span className="text-green-400">&apos;eslint-plugin-browser-security&apos;</span>;{'\n'}
                <span className="text-purple-400">import</span> <span className="text-yellow-400">jwt</span> <span className="text-purple-400">from</span> <span className="text-green-400">&apos;eslint-plugin-jwt&apos;</span>;{'\n'}
                {'\n'}
                <span className="text-purple-400">export default</span> [{'\n'}
                {'  '}browserSecurity.configs.<span className="text-yellow-400">recommended</span>,{'\n'}
                {'  '}jwt.configs.<span className="text-yellow-400">recommended</span>,{'\n'}
                {'  '}<span className="text-fd-muted-foreground">{'// Start protecting your code instantly'}</span>{'\n'}
                ];
              </code>
            </pre>
          </div>

          {/* Floating badges */}
          <div className="absolute -top-4 -right-4 md:right-8 bg-gradient-to-r from-purple-500 to-violet-600 text-white font-bold px-4 py-2 rounded-full text-sm shadow-lg">
            Flat Config ✓
          </div>
        </div>
      </section>

      {/* ===== PLUGIN MARQUEE ===== */}
      <section className="border-y border-fd-border bg-fd-background/50 py-16 overflow-hidden">
        <div className="container mx-auto px-4 mb-8">
          <h2 className="text-2xl font-bold text-center mb-2">Trusted Security & Quality Plugins</h2>
          <p className="text-fd-muted-foreground text-center">Built for real-world JavaScript security challenges</p>
        </div>
        
        <Marquee pauseOnHover className="[--duration:40s]">
          {[...securityPlugins, ...qualityPlugins].map((plugin) => (
            <div
              key={plugin.name}
              className="mx-4 flex items-center gap-3 rounded-xl border border-fd-border bg-fd-card px-5 py-3 shadow-sm hover:shadow-md transition-shadow"
            >
              <plugin.icon className="size-5 text-orange-500" />
              <div>
                <div className="font-semibold text-sm">{plugin.name}</div>
                <div className="text-xs text-fd-muted-foreground">{plugin.desc}</div>
              </div>
            </div>
          ))}
        </Marquee>
      </section>

      {/* ===== TWO PILLARS ===== */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Two Pillars of Excellence
          </h2>
          <p className="text-fd-muted-foreground max-w-2xl mx-auto text-lg">
            Comprehensive coverage organized into Security and Quality categories.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Security Pillar */}
          <Link href="/docs/security" className="group">
            <div className="relative overflow-hidden rounded-2xl border-2 border-fd-border bg-gradient-to-br from-orange-500/10 via-red-500/5 to-transparent p-8 h-full transition-all duration-300 hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-500/20 to-transparent rounded-bl-full" />
              
              <ShieldCheck className="size-14 text-orange-500 mb-6" />
              <h3 className="text-2xl font-bold mb-3">Security</h3>
              <p className="text-fd-muted-foreground mb-6">
                <span className="text-fd-foreground font-semibold">{stats.securityPlugins} plugins</span> protecting against XSS, injection, insecure tokens, and common vulnerability patterns.
              </p>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {['Browser', 'JWT', 'Express', 'Node.js', 'MongoDB'].map(tag => (
                  <span 
                    key={tag}
                    className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-medium text-orange-600 dark:text-orange-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="flex items-center text-orange-500 font-medium">
                Explore Security <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* Quality Pillar */}
          <Link href="/docs/quality" className="group">
            <div className="relative overflow-hidden rounded-2xl border-2 border-fd-border bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-transparent p-8 h-full transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-bl-full" />
              
              <Code2 className="size-14 text-purple-500 mb-6" />
              <h3 className="text-2xl font-bold mb-3">Quality & Architecture</h3>
              <p className="text-fd-muted-foreground mb-6">
                <span className="text-fd-foreground font-semibold">{stats.qualityPlugins} plugins</span> enforcing conventions, modularity, reliability, and modern best practices.
              </p>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {['Conventions', 'Modularity', 'Reliability', 'Modernization'].map(tag => (
                  <span 
                    key={tag}
                    className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-medium text-purple-600 dark:text-purple-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="flex items-center text-purple-500 font-medium">
                Explore Quality <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ===== WHY SECTION ===== */}
      <section className="border-t border-fd-border bg-fd-card/30">
        <div className="container mx-auto px-4 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why ESLint Interlace?
            </h2>
            <p className="text-fd-muted-foreground max-w-xl mx-auto">
              Built by security engineers, for developers who ship with confidence.
            </p>
          </div>

          <Cards className="max-w-5xl mx-auto">
            <FeatureCard
              icon={<Zap className="size-6" />}
              title="Zero Runtime Overhead"
              description="All checks run at lint-time. No production impact, no performance cost."
            />
            <FeatureCard
              icon={<Package className="size-6" />}
              title="Flat Config Native"
              description="Built for ESLint 9+ flat config. Modern, composable, no legacy baggage."
            />
            <FeatureCard
              icon={<ShieldCheck className="size-6" />}
              title="OWASP Aligned"
              description="Security rules mapped to OWASP Top 10 and CWE vulnerability databases."
            />
            <FeatureCard
              icon={<FileCode2 className="size-6" />}
              title="TypeScript First"
              description="Full TypeScript support with type-aware rules and accurate AST analysis."
            />
            <FeatureCard
              icon={<BookOpen className="size-6" />}
              title="Extensive Docs"
              description="Every rule documented with examples, auto-fix info, and remediation guides."
            />
            <FeatureCard
              icon={<Globe className="size-6" />}
              title="Open Source"
              description="MIT licensed, community-driven, and designed for enterprise adoption."
            />
          </Cards>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="container mx-auto px-4 py-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500/20 via-violet-500/15 to-purple-600/20 border border-purple-500/30 p-12 md:p-16 text-center">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-purple-400/30 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-violet-500/30 to-transparent rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          
          <div className="relative">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Ready to Level Up?
            </h2>
            <p className="text-fd-muted-foreground max-w-xl mx-auto mb-10 text-lg">
              Start with one plugin, then expand your coverage. Each plugin works independently or together as a complete security & quality suite.
            </p>
            
            <Link href="/docs/getting-started">
              <ShimmerButton
                className="shadow-2xl mx-auto"
                shimmerColor="#c084fc"
                shimmerSize="0.15em"
                background="linear-gradient(135deg, #8b5cf6, #7c3aed)"
              >
                <span className="flex items-center gap-2 px-8 py-3 text-white font-semibold text-lg">
                  Start Building Safer Code
                  <ArrowRight className="size-5" />
                </span>
              </ShimmerButton>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

// ===== COMPONENTS =====

function StatCard({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-fd-foreground mb-1">
        <NumberTicker value={value} className="text-fd-foreground" />
        {suffix && <span className="text-orange-500">{suffix}</span>}
      </div>
      <div className="text-sm text-fd-muted-foreground font-medium uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card
      icon={icon}
      title={title}
      description={description}
    />
  );
}

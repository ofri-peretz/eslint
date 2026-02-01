import Link from 'next/link';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { 
  ShieldCheck, 
  Code2, 
  ArrowRight,
  Terminal,
  Zap,
  BookOpen,
  Package,
  FileCode2,
  Globe,
  ChevronRight,
} from 'lucide-react';
import { Particles } from '@/components/ui/particles';
import { Marquee } from '@/components/ui/marquee';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { cn } from '@/lib/utils';

// Plugin stats (would be dynamic in production via JSON cache)
const stats = {
  plugins: 19,
  rules: 150,
  securityPlugins: 11,
  qualityPlugins: 8,
};

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      {/* Hero Section - Fumadocs inspired */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Particles Background */}
        <Particles
          className="absolute inset-0 -z-10"
          quantity={100}
          staticity={50}
          ease={50}
          color="#ff6b00"
        />
        
        {/* Gradient Orb Effect */}
        <div className="absolute top-20 right-[10%] w-[500px] h-[500px] -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 via-red-500/20 to-purple-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute inset-10 bg-gradient-to-tr from-yellow-500/20 via-orange-500/30 to-red-500/20 rounded-full blur-2xl" />
        </div>

        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto md:mx-0">
            {/* Badge */}
            <AnimatedGradientText className="mb-6">
              <span className="inline-flex items-center gap-1.5">
                🚀 <hr className="mx-2 h-4 w-px shrink-0 bg-gray-300" />
                <span className="animate-gradient bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent">
                  Enterprise-Grade ESLint Ecosystem
                </span>
                <ChevronRight className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
              </span>
            </AnimatedGradientText>

            {/* Main Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              <span className="text-fd-foreground">Secure & maintain your code,</span>
              <br />
              <span className="text-fd-muted-foreground">your </span>
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                style.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-fd-muted-foreground mb-10 max-w-2xl">
              ESLint Interlace is a <span className="text-fd-foreground font-medium">security & quality</span> plugin ecosystem for <span className="text-fd-foreground font-medium">Developers</span>, 
              beautifully designed by <span className="text-fd-foreground font-medium">security engineers</span>. 
              Bringing powerful linting for your workflows, with high customizability.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4">
              <ShimmerButton
                className="shadow-2xl"
                shimmerColor="#ff6b00"
                shimmerSize="0.1em"
                background="linear-gradient(135deg, #ff6b00, #ee0979)"
              >
                <Link href="/docs/getting-started" className="flex items-center gap-2 px-2 py-1 text-white font-medium">
                  Getting Started
                </Link>
              </ShimmerButton>
              <Link
                href="https://github.com/ofri-peretz/eslint"
                className="inline-flex items-center gap-2 rounded-lg border border-fd-border bg-fd-background px-6 py-3 font-medium transition-colors hover:bg-fd-accent"
              >
                Open GitHub
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Documentation Preview - Fumadocs style */}
      <section className="container px-4 py-12">
        <div className="relative max-w-5xl mx-auto rounded-xl border border-fd-border bg-fd-card/80 backdrop-blur overflow-hidden shadow-2xl">
          <BorderBeam size={300} duration={12} delay={9} colorFrom="#ff6b00" colorTo="#ee0979" />
          
          <div className="grid md:grid-cols-[240px_1fr] min-h-[400px]">
            {/* Sidebar Preview */}
            <div className="hidden md:block border-r border-fd-border bg-fd-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="size-5 rounded bg-gradient-to-br from-orange-500 to-red-500" />
                <span className="font-semibold text-sm">ESLint Interlace</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-fd-accent/50 px-3 py-1.5 text-sm mb-4">
                <span className="text-fd-muted-foreground">⌘</span>
                <span className="text-fd-muted-foreground">Search</span>
                <span className="ml-auto text-xs text-fd-muted-foreground">K</span>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="font-medium text-fd-muted-foreground px-2 py-1">📁 Security</div>
                <div className="text-fd-muted-foreground px-4 py-1">Browser Security</div>
                <div className="text-fd-muted-foreground px-4 py-1">JWT</div>
                <div className="text-fd-muted-foreground px-4 py-1">Express</div>
                <div className="font-medium text-fd-muted-foreground px-2 py-1 mt-3">📁 Quality</div>
                <div className="text-fd-muted-foreground px-4 py-1">Conventions</div>
                <div className="text-fd-muted-foreground px-4 py-1">Modularity</div>
              </div>
            </div>
            
            {/* Content Preview */}
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-2 text-sm text-fd-muted-foreground mb-4">
                <span>Security</span>
                <span>/</span>
                <span>Browser Security</span>
              </div>
              <h2 className="text-2xl font-bold mb-4">no-eval</h2>
              <p className="text-fd-muted-foreground mb-4">
                Disallow the use of <code className="rounded bg-fd-accent px-1.5 py-0.5">eval()</code> and similar dynamic code execution methods 
                that can lead to XSS vulnerabilities.
              </p>
              
              <div className="rounded-lg bg-fd-background border border-fd-border p-4 font-mono text-sm">
                <div className="text-fd-muted-foreground mb-2">{'// ❌ Avoid'}</div>
                <div className="text-red-400">eval(userInput);</div>
                <div className="text-fd-muted-foreground mt-4 mb-2">{'// ✅ Prefer'}</div>
                <div className="text-green-400">JSON.parse(validatedInput);</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-fd-border bg-fd-card/30">
        <div className="container px-4 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <StatCard value={stats.plugins} label="Plugins" />
            <StatCard value={stats.rules} label="Rules" suffix="+" />
            <StatCard value={stats.securityPlugins} label="Security" />
            <StatCard value={stats.qualityPlugins} label="Quality" />
          </div>
        </div>
      </section>

      {/* Plugin Marquee */}
      <section className="py-12 border-b border-fd-border overflow-hidden">
        <div className="text-center mb-8">
          <p className="text-sm text-fd-muted-foreground uppercase tracking-wider">
            Trusted Security & Quality Plugins
          </p>
        </div>
        <Marquee pauseOnHover className="[--duration:40s]">
          {[
            { name: 'browser-security', icon: '🛡️', category: 'security' },
            { name: 'jwt', icon: '🔐', category: 'security' },
            { name: 'express-security', icon: '⚡', category: 'security' },
            { name: 'node-security', icon: '💚', category: 'security' },
            { name: 'mongodb-security', icon: '🍃', category: 'security' },
            { name: 'pg', icon: '🐘', category: 'security' },
            { name: 'nestjs-security', icon: '🐱', category: 'security' },
            { name: 'lambda-security', icon: '☁️', category: 'security' },
            { name: 'react-a11y', icon: '♿', category: 'security' },
          ].map((plugin) => (
            <div
              key={plugin.name}
              className="mx-4 flex items-center gap-2 rounded-lg border border-fd-border bg-fd-card px-4 py-2"
            >
              <span className="text-xl">{plugin.icon}</span>
              <span className="font-medium text-sm">eslint-plugin-{plugin.name}</span>
            </div>
          ))}
        </Marquee>
        <Marquee reverse pauseOnHover className="[--duration:35s] mt-4">
          {[
            { name: 'conventions', icon: '📐', category: 'quality' },
            { name: 'modularity', icon: '📦', category: 'quality' },
            { name: 'modernization', icon: '🚀', category: 'quality' },
            { name: 'reliability', icon: '🔧', category: 'quality' },
            { name: 'operability', icon: '📊', category: 'quality' },
            { name: 'maintainability', icon: '🧹', category: 'quality' },
            { name: 'import-next', icon: '📥', category: 'quality' },
            { name: 'react-features', icon: '⚛️', category: 'quality' },
            { name: 'secure-coding', icon: '🔒', category: 'security' },
            { name: 'vercel-ai-security', icon: '🤖', category: 'security' },
          ].map((plugin) => (
            <div
              key={plugin.name}
              className="mx-4 flex items-center gap-2 rounded-lg border border-fd-border bg-fd-card px-4 py-2"
            >
              <span className="text-xl">{plugin.icon}</span>
              <span className="font-medium text-sm">eslint-plugin-{plugin.name}</span>
            </div>
          ))}
        </Marquee>
      </section>

      {/* Feature Section - Fumadocs "Anybody can write" style */}
      <section className="container px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Anybody can secure.
            </span>
          </h2>
          <p className="text-fd-muted-foreground max-w-2xl mx-auto text-lg">
            Zero-configuration security rules that integrate seamlessly with your existing ESLint setup. 
            From browser to server, we&apos;ve got you covered.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Code Preview */}
          <div className="rounded-xl border border-fd-border bg-fd-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-fd-border bg-fd-background">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-red-500/80" />
                <div className="size-3 rounded-full bg-yellow-500/80" />
                <div className="size-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-fd-muted-foreground ml-2">eslint.config.js</span>
            </div>
            <pre className="p-4 text-sm overflow-x-auto">
              <code>{`import security from 'eslint-plugin-browser-security';
import jwt from 'eslint-plugin-jwt';

export default [
  security.configs.recommended,
  jwt.configs.recommended,
  {
    rules: {
      'browser-security/no-eval': 'error',
      'jwt/no-none-algorithm': 'error',
    }
  }
];`}</code>
            </pre>
          </div>

          {/* Features List */}
          <div className="flex flex-col justify-center space-y-6">
            <h3 className="text-2xl font-bold">Simple but powerful.</h3>
            <p className="text-fd-muted-foreground">
              Security rules for developers who want protection without complexity.
            </p>
            <ul className="space-y-3 text-fd-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-orange-500" />
                Flat Config Native
              </li>
              <li className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-orange-500" />
                TypeScript First
              </li>
              <li className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-orange-500" />
                OWASP & CWE Aligned
              </li>
              <li className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-orange-500" />
                Zero Runtime Overhead
              </li>
              <li className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-orange-500" />
                Extensive Documentation
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Plugin Categories */}
      <section className="container px-4 py-20 border-t border-fd-border">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Two Pillars of Excellence
          </h2>
          <p className="text-fd-muted-foreground max-w-2xl mx-auto">
            Comprehensive rule coverage organized into Security and Quality categories.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Security Card */}
          <Link href="/docs/security" className="group">
            <div className="relative overflow-hidden rounded-xl border border-fd-border bg-gradient-to-br from-red-500/10 via-orange-500/5 to-transparent p-8 transition-all hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10">
              <ShieldCheck className="size-12 text-orange-500 mb-4" />
              <h3 className="text-2xl font-bold mb-2">Security</h3>
              <p className="text-fd-muted-foreground mb-4">
                {stats.securityPlugins} plugins protecting against XSS, injection, 
                insecure tokens, and vulnerability patterns.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Browser', 'JWT', 'Express', 'Node.js', 'MongoDB'].map(tag => (
                  <span 
                    key={tag}
                    className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <ArrowRight className="absolute bottom-8 right-8 size-5 text-fd-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Quality Card */}
          <Link href="/docs/quality" className="group">
            <div className="relative overflow-hidden rounded-xl border border-fd-border bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent p-8 transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10">
              <Code2 className="size-12 text-blue-500 mb-4" />
              <h3 className="text-2xl font-bold mb-2">Quality & Architecture</h3>
              <p className="text-fd-muted-foreground mb-4">
                {stats.qualityPlugins} plugins enforcing conventions, modularity, 
                reliability, and modern best practices.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Conventions', 'Modularity', 'Reliability', 'Modernization'].map(tag => (
                  <span 
                    key={tag}
                    className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <ArrowRight className="absolute bottom-8 right-8 size-5 text-fd-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-fd-border bg-fd-card/30">
        <div className="container px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why ESLint Interlace?
            </h2>
          </div>

          <Cards>
            <Card
              icon={<Zap className="size-5" />}
              title="Zero Runtime Overhead"
              description="All checks run at lint-time. No production impact, no performance cost."
            />
            <Card
              icon={<Package className="size-5" />}
              title="Flat Config Native"
              description="Built for ESLint 9+ flat config. Modern, composable, no legacy baggage."
            />
            <Card
              icon={<ShieldCheck className="size-5" />}
              title="OWASP Aligned"
              description="Security rules mapped to OWASP Top 10 and CWE vulnerability databases."
            />
            <Card
              icon={<FileCode2 className="size-5" />}
              title="TypeScript First"
              description="Full TypeScript support with type-aware rules and accurate AST analysis."
            />
            <Card
              icon={<BookOpen className="size-5" />}
              title="Extensive Docs"
              description="Every rule documented with examples, auto-fix info, and remediation guides."
            />
            <Card
              icon={<Globe className="size-5" />}
              title="Open Source"
              description="MIT licensed, community-driven, and designed for enterprise adoption."
            />
          </Cards>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container px-4 py-24">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/20 via-red-500/10 to-purple-500/20 border border-orange-500/30 p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Level Up?
          </h2>
          <p className="text-fd-muted-foreground max-w-xl mx-auto mb-8">
            Start with one plugin, then expand your coverage. Each plugin 
            works independently or together as a complete security & quality suite.
          </p>
          <ShimmerButton
            className="shadow-2xl mx-auto"
            shimmerColor="#ff6b00"
            shimmerSize="0.1em"
            background="linear-gradient(135deg, #ff6b00, #ee0979)"
          >
            <Link href="/docs/getting-started" className="flex items-center gap-2 px-4 py-2 text-white font-medium text-lg">
              Start Building Safer Code
              <ArrowRight className="size-5" />
            </Link>
          </ShimmerButton>
        </div>
      </section>
    </main>
  );
}

function StatCard({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  return (
    <div>
      <div className="text-4xl md:text-5xl font-bold text-fd-foreground mb-1">
        <NumberTicker value={value} className="text-fd-foreground" />
        {suffix && <span>{suffix}</span>}
      </div>
      <div className="text-sm text-fd-muted-foreground font-medium">
        {label}
      </div>
    </div>
  );
}

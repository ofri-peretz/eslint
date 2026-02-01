import Link from 'next/link';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { 
  ShieldCheck, 
  Code2, 
  Sparkles, 
  ArrowRight,
  Terminal,
  Zap,
  BookOpen,
  Package,
} from 'lucide-react';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';

// Plugin stats (would be dynamic in production)
const stats = {
  plugins: 19,
  rules: 150,
  securityPlugins: 11,
  qualityPlugins: 8,
};

export default function HomePage() {
  return (
    <main className="relative">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 -z-10">
          <InteractiveGridPattern
            className="opacity-40 dark:opacity-30"
            width={60}
            height={60}
            squares={[20, 15]}
            squaresClassName="fill-fd-primary/5 stroke-fd-primary/20 hover:fill-fd-primary/20"
          />
        </div>

        {/* Hero Content */}
        <div className="container relative z-10 px-4 py-24 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-fd-primary/30 bg-fd-primary/10 px-4 py-1.5 text-sm font-medium text-fd-primary mb-8">
            <Sparkles className="size-4" />
            <span>Enterprise-Grade ESLint Ecosystem</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            <span className="text-fd-foreground">Security & Quality</span>
            <br />
            <span className="bg-gradient-to-r from-fd-primary to-purple-400 bg-clip-text text-transparent">
              Rules That Scale
            </span>
          </h1>

          {/* Subheadline */}
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-fd-muted-foreground mb-10">
            {stats.plugins} specialized ESLint plugins with {stats.rules}+ rules covering
            browser security, server protection, accessibility, and code quality.
            Built for modern JavaScript and TypeScript.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/docs/getting-started"
              className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-6 py-3 font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
            >
              Get Started
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-lg border border-fd-border bg-fd-background px-6 py-3 font-medium transition-colors hover:bg-fd-accent"
            >
              <BookOpen className="size-4" />
              Documentation
            </Link>
          </div>

          {/* Quick Install */}
          <div className="mt-12 inline-flex items-center gap-3 rounded-lg border border-fd-border bg-fd-card/80 backdrop-blur px-4 py-2 text-sm font-mono">
            <Terminal className="size-4 text-fd-muted-foreground" />
            <code className="text-fd-foreground">npm install eslint-plugin-browser-security</code>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-fd-border bg-fd-card/50">
        <div className="container px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <StatCard value={stats.plugins} label="Plugins" />
            <StatCard value={`${stats.rules}+`} label="Rules" />
            <StatCard value={stats.securityPlugins} label="Security" />
            <StatCard value={stats.qualityPlugins} label="Quality" />
          </div>
        </div>
      </section>

      {/* Plugin Categories */}
      <section className="container px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Two Pillars of Excellence
          </h2>
          <p className="text-fd-muted-foreground max-w-2xl mx-auto">
            Comprehensive rule coverage organized into Security and Quality categories,
            each targeting specific aspects of modern application development.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Security Card */}
          <Link href="/docs/security" className="group">
            <div className="relative overflow-hidden rounded-xl border border-fd-border bg-gradient-to-br from-red-500/10 to-orange-500/10 p-8 transition-all hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10">
              <ShieldCheck className="size-12 text-red-500 mb-4" />
              <h3 className="text-2xl font-bold mb-2">Security</h3>
              <p className="text-fd-muted-foreground mb-4">
                {stats.securityPlugins} plugins protecting against XSS, injection, 
                insecure tokens, and vulnerability patterns.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Browser', 'JWT', 'Express', 'Node.js', 'MongoDB'].map(tag => (
                  <span 
                    key={tag}
                    className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400"
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
            <div className="relative overflow-hidden rounded-xl border border-fd-border bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-8 transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10">
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

      {/* Features Section */}
      <section className="border-t border-fd-border bg-fd-card/30">
        <div className="container px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why ESLint Interlace?
            </h2>
            <p className="text-fd-muted-foreground max-w-2xl mx-auto">
              Built for teams who take code quality and security seriously.
            </p>
          </div>

          <Cards>
            <Card
              icon={<Zap className="size-5" />}
              title="Zero Runtime Overhead"
              description="All checks run at lint-time with no production impact. Catch issues before they ship."
            />
            <Card
              icon={<Package className="size-5" />}
              title="Flat Config Native"
              description="Built from the ground up for ESLint's modern flat config format. No legacy baggage."
            />
            <Card
              icon={<ShieldCheck className="size-5" />}
              title="OWASP Aligned"
              description="Security rules mapped to OWASP Top 10, CWE, and industry vulnerability databases."
            />
            <Card
              icon={<Code2 className="size-5" />}
              title="TypeScript First"
              description="Full TypeScript support with type-aware rules and accurate AST analysis."
            />
          </Cards>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container px-4 py-20">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-fd-primary/20 to-purple-500/20 border border-fd-primary/30 p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Level Up?
          </h2>
          <p className="text-fd-muted-foreground max-w-xl mx-auto mb-8">
            Start with one plugin, then expand your coverage. Each plugin 
            works independently or together as a complete security & quality suite.
          </p>
          <Link
            href="/docs/getting-started"
            className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-8 py-4 text-lg font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
          >
            Start Building Safer Code
            <ArrowRight className="size-5" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div className="text-4xl md:text-5xl font-bold text-fd-primary mb-1">
        {value}
      </div>
      <div className="text-sm text-fd-muted-foreground font-medium">
        {label}
      </div>
    </div>
  );
}

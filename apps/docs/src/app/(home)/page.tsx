import Link from 'next/link';
import Image from 'next/image';
import { Shield, Zap, Lock, Code, ArrowRight, Terminal, CheckCircle } from 'lucide-react';

const stats = [
  { label: 'Security Rules', value: '216+', icon: Shield },
  { label: 'Specialized Plugins', value: '11', icon: Code },
  { label: 'OWASP Coverage', value: '100%', icon: Lock },
  { label: 'LLM-Optimized', value: '✓', icon: Zap },
];

const plugins = [
  { name: 'eslint-plugin-secure-coding', rules: 75, description: 'General security & OWASP mapping' },
  { name: 'eslint-plugin-crypto', rules: 24, description: 'Cryptographic best practices' },
  { name: 'eslint-plugin-jwt', rules: 13, description: 'JWT security & claims validation' },
  { name: 'eslint-plugin-pg', rules: 13, description: 'PostgreSQL security' },
  { name: 'eslint-plugin-browser-security', rules: 21, description: 'XSS & client-side security' },
  { name: 'eslint-plugin-vercel-ai-security', rules: 19, description: 'AI/LLM application security' },
];

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative px-6 py-20 text-center bg-gradient-to-b from-fd-background to-fd-accent/30">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Image src="/eslint-logo.svg" alt="ESLint" width={48} height={48} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl bg-gradient-to-r from-purple-500 to-violet-500 bg-clip-text text-transparent">
            Interlace ESLint Ecosystem
          </h1>
          <p className="mt-4 text-lg leading-8 text-fd-muted-foreground max-w-2xl mx-auto">
            <strong>216+ security rules</strong> across 11 specialized plugins.{' '}
            LLM-optimized error messages with CWE, OWASP, and CVSS metadata.
          </p>
          
          {/* Quick Install */}
          <div className="mt-6 p-3 rounded-lg bg-fd-card border border-fd-border max-w-md mx-auto">
            <div className="flex items-center gap-2 text-xs text-fd-muted-foreground mb-2">
              <Terminal className="size-3" />
              <span>Quick Install</span>
            </div>
            <code className="block text-sm bg-fd-muted px-3 py-2 rounded border border-fd-border font-mono text-left">
              npm install eslint-plugin-secure-coding
            </code>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 transition-colors"
            >
              Get Started
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/docs/benchmarks"
              className="inline-flex items-center gap-2 rounded-lg border border-fd-border px-5 py-2.5 text-sm font-semibold hover:bg-fd-accent transition-colors"
            >
              View Benchmarks
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-6 border-t border-fd-border">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <stat.icon className="size-5 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-fd-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Plugins Grid */}
      <section className="py-12 px-6 bg-fd-accent/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-6">Specialized Plugins</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {plugins.map((plugin) => (
              <Link
                key={plugin.name}
                href={`/docs/${plugin.name.replace('eslint-plugin-', '')}`}
                className="p-3 rounded-lg border border-fd-border bg-fd-card hover:border-purple-500/50 transition-colors group"
              >
                <div className="flex items-center justify-between mb-1">
                  <code className="text-xs font-mono text-purple-500 group-hover:text-purple-400">
                    {plugin.name}
                  </code>
                  <span className="text-xs bg-fd-accent px-2 py-0.5 rounded">
                    {plugin.rules} rules
                  </span>
                </div>
                <p className="text-xs text-fd-muted-foreground">{plugin.description}</p>
              </Link>
            ))}
          </div>
          <p className="text-center text-xs text-fd-muted-foreground mt-4">
            + 5 more plugins for Express, NestJS, Lambda, MongoDB, and Import analysis
          </p>
        </div>
      </section>

      {/* Error Message Demo */}
      <section className="py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-3">LLM-Optimized Error Messages</h2>
          <p className="text-center text-sm text-fd-muted-foreground mb-6">
            Structured metadata that AI assistants understand
          </p>
          <div className="p-4 rounded-lg bg-fd-card border border-fd-border font-mono text-sm overflow-x-auto">
            <div className="text-red-400 text-xs">src/api.ts:42:15</div>
            <div className="mt-2 text-xs">
              <span className="text-red-400">error</span>{' '}
              <span className="text-yellow-400">🔒 CWE-89</span>{' '}
              <span className="text-cyan-400">OWASP:A03</span>{' '}
              <span className="text-orange-400">CVSS:9.8</span>{' '}
              <span className="text-fd-foreground">| SQL Injection |</span>{' '}
              <span className="text-red-400">CRITICAL</span>
            </div>
            <div className="mt-1 text-purple-400 text-xs">
              Fix: db.query("SELECT * FROM users WHERE id = ?", [userId])
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-6 px-6 border-t border-fd-border">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-fd-muted-foreground">
          <div>
            MIT © <a href="https://github.com/ofri-peretz" className="underline hover:text-fd-foreground">Ofri Peretz</a>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/ofri-peretz/eslint" className="hover:text-fd-foreground">GitHub</a>
            <a href="https://www.npmjs.com/~ofri-peretz" className="hover:text-fd-foreground">npm</a>
            <a href="https://ofriperetz.dev" className="hover:text-fd-foreground">ofriperetz.dev</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

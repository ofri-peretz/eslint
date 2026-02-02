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
  Terminal,
  Lock,
  Bug,
  Database,
  Import,
  Trophy,
  ExternalLink,
  Star,
} from 'lucide-react';
import { BackgroundLines } from '@/components/ui/background-lines';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { Marquee } from '@/components/ui/marquee';
import { TweetCard } from '@/components/ui/tweet-card';
import { DevToCard } from '@/components/ui/devto-card';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { getDisplayStats } from '@/lib/stats-loader';
import { HeroSection } from '@/components/home/hero-section';

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

export default async function HomePage() {
  // Load stats dynamically from JSON files (updated by GH Actions)
  const stats = await getDisplayStats();
  
  return (
    <main className="relative min-h-screen">
      {/* ===== HERO SECTION with Theme-Aware Gradient Animation ===== */}
      <HeroSection />

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
            
            {/* Code Content - WCAG accessible colors for light/dark themes */}
            <pre className="p-6 text-sm md:text-base overflow-x-auto">
              <code className="font-mono">
                <span className="text-purple-600 dark:text-purple-400">import</span> <span className="text-amber-600 dark:text-yellow-400">browserSecurity</span> <span className="text-purple-600 dark:text-purple-400">from</span> <span className="text-green-600 dark:text-green-400">&apos;eslint-plugin-browser-security&apos;</span>;{'\n'}
                <span className="text-purple-600 dark:text-purple-400">import</span> <span className="text-amber-600 dark:text-yellow-400">jwt</span> <span className="text-purple-600 dark:text-purple-400">from</span> <span className="text-green-600 dark:text-green-400">&apos;eslint-plugin-jwt&apos;</span>;{'\n'}
                {'\n'}
                <span className="text-purple-600 dark:text-purple-400">export default</span> [{'\n'}
                {'  '}browserSecurity.configs.<span className="text-amber-600 dark:text-yellow-400">recommended</span>,{'\n'}
                {'  '}jwt.configs.<span className="text-amber-600 dark:text-yellow-400">recommended</span>,{'\n'}
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

      {/* ===== COMMUNITY PRAISE / SOCIAL PROOF with BackgroundLines ===== */}
      <section className="relative" style={{ contain: 'paint', clipPath: 'inset(0)' }}>
        <BackgroundLines
          className="py-24"
          svgOptions={{ duration: 10 }}
        >
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <AnimatedGradientText className="mb-4 inline-flex">
                <span className="inline-flex items-center gap-2">
                  <Trophy className="size-4" />
                  <span className="animate-gradient bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 bg-[length:200%_100%] bg-clip-text text-transparent font-medium">
                    Featured in Top 7
                  </span>
                </span>
              </AnimatedGradientText>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Loved by the Community
              </h2>
              <p className="text-fd-muted-foreground max-w-2xl mx-auto text-lg">
                Security insights that developers trust. See what the community is saying.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
              {/* Real Tweet from DEV Community */}
              <div className="flex justify-center h-full">
                <TweetCard id="2006790779537121585" />
              </div>

              {/* Dev.to Top 7 Featured Card */}
              <div className="flex justify-center h-full">
                <DevToCard path="devteam/top-7-featured-dev-posts-of-the-week-2cgm" />
              </div>

              {/* Developer Testimonial Card - Different topic: plugin discovery */}
              <div className="relative flex flex-col gap-4 overflow-hidden rounded-xl border border-fd-border bg-fd-card/80 backdrop-blur-sm p-6 hover:border-fd-border/80 transition-all duration-300 h-full">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="size-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <blockquote className="text-fd-foreground leading-relaxed italic">
                      &ldquo;Finally, a security-focused ESLint ecosystem that catches real vulnerabilities. Found 3 XSS vectors in our React app within minutes of installing browser-security.&rdquo;
                    </blockquote>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="h-px flex-1 bg-fd-border" />
                      <span className="text-xs text-fd-muted-foreground font-medium">
                        Developer Feedback
                      </span>
                    </div>
                  </div>
                </div>

                {/* Value Props */}
                <div className="flex flex-wrap gap-2 mt-auto pt-2">
                  <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-medium text-green-600 dark:text-green-400">
                    Real-time detection
                  </span>
                  <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                    Zero config
                  </span>
                  <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-medium text-purple-600 dark:text-purple-400">
                    Auto-fix ready
                  </span>
                </div>
              </div>
            </div>
          </div>
        </BackgroundLines>
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

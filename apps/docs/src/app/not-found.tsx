'use client';

import Link from 'next/link';
import { Shield, ArrowRight, Home, Book, Search, Zap, Code } from 'lucide-react';
import { FlickeringGrid } from '@/components/ui/flickering-grid';
import { ShimmerButton } from '@/components/ui/shimmer-button';

export default function NotFound() {
  return (
    <main className="relative min-h-[calc(100vh-200px)] flex items-center justify-center p-6 overflow-hidden">
      <FlickeringGrid
        className="absolute inset-0 z-0"
        squareSize={4}
        gridGap={6}
        color="rgb(139, 92, 246)"
        maxOpacity={0.1}
        flickerChance={0.1}
      />
      
      <div className="absolute inset-0 bg-linear-to-b from-fd-background/80 via-fd-background/60 to-fd-background z-1" />
      
      <div className="max-w-3xl w-full relative z-10 text-center">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-20" />
            <div className="h-20 w-20 rounded-2xl bg-fd-card border border-fd-border/50 flex items-center justify-center relative">
              <Shield className="size-10 text-purple-500" />
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-bold mb-4 bg-linear-to-r from-purple-400 to-violet-600 bg-clip-text text-transparent">
          404 - Page Not Found
        </h1>
        <p className="text-fd-muted-foreground text-lg mb-12 max-w-xl mx-auto">
          The page you're looking for doesn't exist. It might have been moved to a new section of our security ecosystem.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <Link href="/">
            <div className="h-full p-6 rounded-2xl bg-fd-card border border-fd-border/50 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left group">
              <Home className="size-6 text-purple-500 mb-4" />
              <h3 className="font-bold mb-2 flex items-center gap-2">
                Home
                <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-fd-muted-foreground leading-relaxed">Return to the start and find your way back.</p>
            </div>
          </Link>
          <Link href="/docs">
            <div className="h-full p-6 rounded-2xl bg-fd-card border border-fd-border/50 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left group">
              <Book className="size-6 text-emerald-500 mb-4" />
              <h3 className="font-bold mb-2 flex items-center gap-2">
                Documentation
                <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-fd-muted-foreground leading-relaxed">Explore plugins, rules, and integration guides.</p>
            </div>
          </Link>
          <Link href="/docs/secure-coding">
             <div className="h-full p-6 rounded-2xl bg-fd-card border border-fd-border/50 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left group">
              <Zap className="size-6 text-blue-500 mb-4" />
              <h3 className="font-bold mb-2 flex items-center gap-2">
                Security Rules
                <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-fd-muted-foreground leading-relaxed">Browse 216+ security rules for the AI era.</p>
            </div>
          </Link>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2 text-sm text-fd-muted-foreground pb-2 border-b border-fd-border/50">
             <Code className="size-4" />
             <span className="font-mono">Searching for something specific?</span>
          </div>
          <Link href="/docs">
            <ShimmerButton>
              <span className="flex items-center gap-2 font-semibold">
                <Search className="size-4" />
                Open Documentation Search
              </span>
            </ShimmerButton>
          </Link>
        </div>
      </div>
    </main>
  );
}

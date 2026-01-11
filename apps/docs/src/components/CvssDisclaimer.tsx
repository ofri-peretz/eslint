import Link from 'next/link';
import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

export function CvssDisclaimer({ className }: { className?: string }) {
  return (
    <div className={`group relative overflow-hidden rounded-lg border border-fd-border/50 bg-fd-muted/20 p-4 transition-all hover:bg-fd-muted/40 hover:border-fd-border/80 ${className}`}>
      {/* Decorative gradient glow on hover */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-fd-primary/5 blur-3xl transition-opacity opacity-0 group-hover:opacity-100" />
      
      <div className="relative flex items-start gap-3">
        <div className="mt-px shrink-0 rounded-md bg-fd-primary/10 p-1.5 text-fd-primary ring-1 ring-inset ring-fd-primary/20">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-fd-foreground">
              AI-Generated Risk Assessment
            </span>
            <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              Beta
            </span>
          </div>
          
          <p className="text-[11px] leading-relaxed text-fd-muted-foreground">
            CVSS scores are currently assumed by AI until the CVE synchronizer is connected.
          </p>
          
          <div className="pt-0.5">
            <Link 
              href="/docs/concepts/security-standards" 
              className="inline-flex items-center gap-1 text-[11px] font-medium text-fd-primary transition-colors hover:text-fd-primary/80"
            >
              See more in our advanced article
              <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

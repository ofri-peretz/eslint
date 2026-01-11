'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AlertTriangle, Info } from 'lucide-react';

/**
 * Rule documentation components
 * 
 * Color semantics (WCAG AAA compliant):
 * - FalseNegativeCTA: Amber/yellow for warnings about limitations
 * - WhenNotToUse: Blue for informational guidance
 */

export function FalseNegativeCTA() {
  return (
    <Link 
      href="/docs/concepts/static-analysis"
      className="group relative flex items-center gap-4 my-6 p-5 rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-all duration-200 hover:border-amber-400 dark:hover:border-amber-600 cursor-pointer"
    >
      {/* Icon - Amber warning */}
      <div className="relative shrink-0 p-2.5 rounded-lg bg-amber-200 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400">
        <AlertTriangle className="w-5 h-5" />
      </div>
      
      <div className="relative flex-1 min-w-0">
        {/* Title - amber-900 on amber-50 = high contrast */}
        <div className="font-medium text-amber-900 dark:text-amber-100 flex items-center gap-2">
          Want to understand why?
          <span className="text-amber-500 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
            →
          </span>
        </div>
        {/* Description */}
        <div className="text-sm text-amber-800 dark:text-amber-200/80 mt-0.5">
          Learn about Static Analysis limitations in our Advanced Topics
        </div>
      </div>
    </Link>
  );
}


interface WhenNotToUseProps {
  children?: React.ReactNode;
}

export function WhenNotToUse({ children }: WhenNotToUseProps) {
  return (
    <div className="my-8 p-6 rounded-lg border border-sky-200 dark:border-sky-800/60 bg-sky-50 dark:bg-sky-950/40">
      {/* Header - blue info style */}
      <h2 className="text-lg font-semibold mb-3 text-sky-900 dark:text-sky-100 flex items-center gap-2.5">
        <span className="p-1.5 rounded-md bg-sky-200 dark:bg-sky-800/60 text-sky-700 dark:text-sky-300">
          <Info className="w-4 h-4" />
        </span>
        When Not To Use It
      </h2>
      
      {/* Content */}
      <div className="text-sm text-sky-800 dark:text-sky-200/80 leading-relaxed">
        {children || (
          <span className="block">
            Use this rule when you want to be safe! If you are writing a quick script, 
            maybe you can disable it, but strictly speaking, it&apos;s always good practice!
          </span>
        )}
      </div>
    </div>
  );
}

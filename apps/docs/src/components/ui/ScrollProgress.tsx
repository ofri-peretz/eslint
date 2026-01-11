'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

/**
 * ScrollProgress - A fixed scroll progress indicator.
 * 
 * SSR/Hydration Strategy (Long-Term Fix):
 * - Returns null during SSR and initial client render (mounted guard)
 * - Uses createPortal to document.body ONLY after useEffect runs
 * - This prevents hydration mismatch since null === null (server === first client)
 * - Uses passive event listener for better scroll performance
 */
export function ScrollProgress({ className }: { className?: string }) {
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  const portalTarget = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Store the portal target after mount (avoids SSR issues)
    portalTarget.current = document.body;
    setMounted(true);

    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (windowHeight === 0) {
        setProgress(0);
        return;
      }
      const scroll = totalScroll / windowHeight;
      setProgress(Math.min(Math.max(scroll, 0), 1));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // CRITICAL: Return null during SSR and first client render
  // This ensures server HTML (null) matches initial client HTML (null)
  // preventing hydration mismatch errors
  if (!mounted || !portalTarget.current) return null;

  return createPortal(
    <div className={cn("fixed top-0 left-0 right-0 h-[3px] z-[99999] pointer-events-none", className)}>
      <div 
        className="h-full bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 transition-transform duration-100 ease-out origin-left shadow-[0_0_10px_rgba(168,85,247,0.5)]"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>,
    portalTarget.current
  );
}

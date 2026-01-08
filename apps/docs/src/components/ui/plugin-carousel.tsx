'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface PluginCarouselProps {
  plugins: string[];
  className?: string;
  interval?: number;
}

export function PluginCarousel({ plugins, className, interval = 3000 }: PluginCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % plugins.length);
        setIsAnimating(false);
      }, 300);
    }, interval);

    return () => clearInterval(timer);
  }, [plugins.length, interval]);

  return (
    <span
      className={cn(
        'inline-block transition-all duration-300',
        isAnimating ? 'opacity-0 blur-sm translate-y-1' : 'opacity-100 blur-0 translate-y-0',
        className
      )}
    >
      {plugins[currentIndex]}
    </span>
  );
}

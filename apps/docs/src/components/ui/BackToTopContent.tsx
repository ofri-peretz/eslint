'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  const content = (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        onClick={scrollToTop}
        style={{ zIndex: 99999, bottom: '2rem', right: '2rem' }}
        className={cn(
          "fixed bottom-8 right-8 p-3 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95",
          "bg-fd-primary text-fd-primary-foreground hover:bg-fd-accent hover:text-fd-accent-foreground",
          "border border-white/20 backdrop-blur-md"
        )}
        aria-label="Scroll to top"
      >
        <ArrowUp className="size-5" />
      </motion.button>
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}

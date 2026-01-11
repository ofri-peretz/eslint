import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { Github, Shield, Terminal } from 'lucide-react';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      // Changed from 'top' to 'none' to prevent content overlap issues
      // and ensure nav is always clearly visible with proper background
      transparentMode: 'none',
      title: (
        <div className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-fd-primary/20 to-fd-primary/0 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <Image
              src="/eslint-interlace-logo.svg"
              alt="Interlace ESLint"
              width={28}
              height={28}
              className="relative size-7 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
            />
          </div>
          <span className="font-bold tracking-tight text-[1.15rem] bg-gradient-to-r from-purple-400 via-violet-500 to-purple-600 bg-clip-text text-transparent">
            ESLint Interlace
          </span>
        </div>
      ),
    },
    links: [],
    githubUrl: 'https://github.com/ofri-peretz/eslint',
  };
}

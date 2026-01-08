'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BorderBeam } from './ui/border-beam';

interface PluginCardProps {
  title: string;
  rules: number;
  description: string;
  href: string;
  icon?: string;
  logo?: React.ComponentType<{ className?: string }>;
  category?: 'security' | 'framework' | 'architecture';
}


const categoryStyles = {
  security: {
    gradient: 'from-violet-500/20 via-purple-500/10 to-fuchsia-500/20 dark:from-violet-500/20 dark:via-purple-500/10 dark:to-fuchsia-500/20',
    border: 'border-violet-500/30 hover:border-violet-500/60',
    glow: 'group-hover:shadow-violet-500/25',
    beamFrom: '#a855f7',
    beamTo: '#d946ef',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
    icon: '🔒',
  },
  framework: {
    gradient: 'from-cyan-500/20 via-blue-500/10 to-indigo-500/20 dark:from-cyan-500/20 dark:via-blue-500/10 dark:to-indigo-500/20',
    border: 'border-cyan-500/30 hover:border-cyan-500/60',
    glow: 'group-hover:shadow-cyan-500/25',
    beamFrom: '#06b6d4',
    beamTo: '#6366f1',
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
    icon: '⚡',
  },
  architecture: {
    gradient: 'from-emerald-500/20 via-green-500/10 to-teal-500/20 dark:from-emerald-500/20 dark:via-green-500/10 dark:to-teal-500/20',
    border: 'border-emerald-500/30 hover:border-emerald-500/60',
    glow: 'group-hover:shadow-emerald-500/25',
    beamFrom: '#10b981',
    beamTo: '#14b8a6',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    icon: '🏗️',
  },
};

export function PluginCard({
  title,
  rules,
  description,
  href,
  icon,
  logo: Logo,
  category = 'security',
}: PluginCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const styles = categoryStyles[category];

  return (
    <Link href={href} className="block h-full">
      <div
        ref={cardRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'group relative h-full rounded-xl overflow-hidden',
          'bg-linear-to-br',
          styles.gradient,
          'border transition-all duration-300',
          styles.border,
          'hover:shadow-2xl',
          styles.glow,
          'transform hover:-translate-y-1 hover:scale-[1.02]',
          'cursor-pointer'
        )}
      >
        {/* Border beam effect on hover */}
        {isHovered && (
          <BorderBeam
            size={150}
            duration={8}
            colorFrom={styles.beamFrom}
            colorTo={styles.beamTo}
            borderWidth={2}
          />
        )}

        {/* Shimmer overlay on hover */}
        <div
          className={cn(
            'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500',
            'bg-linear-to-r from-transparent via-white/5 to-transparent',
            '-skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%]',
            'transition-transform duration-1000 ease-out'
          )}
        />

        {/* Content */}
        <div className="relative p-5 h-full flex flex-col">
          {/* Header with icon/logo */}
          <div className="flex items-start gap-3 mb-3">
            {Logo ? (
              <Logo className="size-6 shrink-0 text-fd-foreground" />
            ) : (
              <span className="text-2xl shrink-0">{icon || styles.icon}</span>
            )}
            <h3 className="font-bold text-fd-foreground group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-linear-to-r group-hover:from-fd-foreground group-hover:to-purple-400 transition-all duration-300 leading-tight">
              {title}
            </h3>
          </div>

          {/* Description */}
          <p className="text-sm text-fd-muted-foreground group-hover:text-fd-foreground transition-colors grow pr-16">
            {description}
          </p>

          {/* Footer with arrow indicator */}
          <div className="mt-4 flex items-center gap-2 text-sm text-fd-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            <span>Explore</span>
            <span className="transform group-hover:translate-x-2 transition-transform duration-300">
              →
            </span>
          </div>

          {/* Rules badge - absolute positioned bottom-right */}
          <div
            className={cn(
              'absolute bottom-5 right-5 px-2.5 py-1 rounded-full text-xs font-semibold',
              styles.badge,
              'group-hover:scale-110 transition-transform duration-300'
            )}
          >
            {rules} rules
          </div>
        </div>

        {/* Subtle glow effect */}
        <div
          className={cn(
            'absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8',
            'bg-linear-to-t opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500',
            category === 'security' && 'from-violet-500',
            category === 'framework' && 'from-cyan-500',
            category === 'architecture' && 'from-emerald-500'
          )}
        />
      </div>
    </Link>
  );
}

interface PluginCardsProps {
  children: React.ReactNode;
  columns?: 2 | 3;
}

export function PluginCards({ children, columns = 2 }: PluginCardsProps) {
  return (
    <div
      className={cn(
        'grid gap-4 my-6',
        columns === 2 && 'md:grid-cols-2',
        columns === 3 && 'md:grid-cols-3'
      )}
    >
      {children}
    </div>
  );
}

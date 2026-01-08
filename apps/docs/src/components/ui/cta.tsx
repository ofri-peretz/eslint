'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CTAButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  external?: boolean;
  className?: string;
}

export function CTAButton({
  href,
  children,
  variant = 'primary',
  external = false,
  className,
}: CTAButtonProps) {
  const Component = external ? 'a' : Link;
  const externalProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <Component
      href={href}
      {...externalProps}
      className={cn(
        'group relative inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-full transition-all duration-300',
        variant === 'primary' && [
          'bg-linear-to-r from-violet-600 to-purple-600',
          'hover:from-violet-500 hover:to-purple-500',
          'text-white shadow-lg shadow-purple-500/25',
          'hover:shadow-xl hover:shadow-purple-500/30',
          'hover:-translate-y-0.5',
        ],
        variant === 'secondary' && [
          'bg-white/5 border border-white/10',
          'hover:bg-white/10 hover:border-white/20',
          'text-gray-300 hover:text-white',
        ],
        className
      )}
    >
      {/* Shimmer effect for primary */}
      {variant === 'primary' && (
        <span className="absolute inset-0 rounded-full overflow-hidden">
          <span className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </span>
      )}
      
      <span className="relative z-10 flex items-center gap-2">
        {children}
        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
      </span>
    </Component>
  );
}

interface CTACardProps {
  href: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  external?: boolean;
  gradient?: 'purple' | 'emerald' | 'blue' | 'amber';
}

export function CTACard({
  href,
  title,
  description,
  icon,
  external = false,
  gradient = 'purple',
}: CTACardProps) {
  const Component = external ? 'a' : Link;
  const externalProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  const gradients = {
    purple: {
      bg: 'from-violet-950/50 to-purple-900/30',
      border: 'border-violet-500/20 hover:border-violet-500/40',
      glow: 'group-hover:shadow-violet-500/20',
      accent: 'text-violet-400',
    },
    emerald: {
      bg: 'from-emerald-950/50 to-teal-900/30',
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      glow: 'group-hover:shadow-emerald-500/20',
      accent: 'text-emerald-400',
    },
    blue: {
      bg: 'from-blue-950/50 to-cyan-900/30',
      border: 'border-blue-500/20 hover:border-blue-500/40',
      glow: 'group-hover:shadow-blue-500/20',
      accent: 'text-blue-400',
    },
    amber: {
      bg: 'from-amber-950/50 to-orange-900/30',
      border: 'border-amber-500/20 hover:border-amber-500/40',
      glow: 'group-hover:shadow-amber-500/20',
      accent: 'text-amber-400',
    },
  };

  const g = gradients[gradient];

  return (
    <Component
      href={href}
      {...externalProps}
      className={cn(
        'group relative overflow-hidden rounded-xl p-6',
        'bg-linear-to-br', g.bg,
        'border', g.border,
        'transition-all duration-300',
        'hover:-translate-y-1',
        'shadow-lg group-hover:shadow-xl', g.glow
      )}
    >
      {/* Shimmer effect */}
      <span className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      
      <div className="relative z-10">
        {icon && (
          <div className={cn('text-2xl mb-3', g.accent)}>
            {icon}
          </div>
        )}
        <h3 className="font-semibold text-fd-foreground mb-1 flex items-center gap-2">
          {title}
          <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">→</span>
        </h3>
        <p className="text-sm text-fd-muted-foreground group-hover:text-fd-foreground transition-colors">
          {description}
        </p>
      </div>
    </Component>
  );
}

interface CTAGridProps {
  children: React.ReactNode;
  columns?: 2 | 3;
}

export function CTAGrid({ children, columns = 2 }: CTAGridProps) {
  return (
    <div className={cn(
      'grid gap-4 my-6',
      columns === 2 && 'sm:grid-cols-2',
      columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3'
    )}>
      {children}
    </div>
  );
}

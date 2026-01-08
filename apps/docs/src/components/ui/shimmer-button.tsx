'use client';

import { cn } from '@/lib/utils';
import { ComponentPropsWithoutRef, forwardRef } from 'react';

export interface ShimmerButtonProps extends ComponentPropsWithoutRef<'button'> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
}

export const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = '#ffffff',
      shimmerSize = '0.05em',
      shimmerDuration = '3s',
      borderRadius = '100px',
      background = 'rgba(139, 92, 246, 1)',
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        style={{
          '--shimmer-color': shimmerColor,
          '--shimmer-size': shimmerSize,
          '--shimmer-duration': shimmerDuration,
          '--border-radius': borderRadius,
          '--background': background,
        } as Record<string, string>}
        className={cn(
          'group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap px-6 py-3 font-semibold text-white [background:var(--background)] rounded-[var(--border-radius)]',
          'transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px',
          className
        )}
        {...props}
      >
        {/* Spark container */}
        <div
          className={cn(
            '-z-30 blur-[2px]',
            'absolute inset-0 overflow-visible [container-type:size]'
          )}
        >
          {/* Spark */}
          <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [border-radius:0] [mask:none]">
            {/* Spark before */}
            <div className="absolute -inset-full w-auto rotate-0 animate-spin-around [background:conic-gradient(from_calc(270deg-(var(--shimmer-spread)*0.5)),transparent_0,var(--shimmer-color)_var(--shimmer-spread),transparent_var(--shimmer-spread))] [translate:0_0]" />
          </div>
        </div>

        {children}

        {/* Highlight */}
        <div
          className={cn(
            'insert-0 absolute size-full',
            'rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f]',
            'transform-gpu transition-all duration-300 ease-in-out',
            'group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]',
            'group-active:shadow-[inset_0_-10px_10px_#ffffff3f]'
          )}
        />

        {/* Backdrop */}
        <div
          className={cn(
            'absolute -z-20 [background:var(--background)] [border-radius:var(--border-radius)] [inset:var(--shimmer-size)]'
          )}
        />
      </button>
    );
  }
);

ShimmerButton.displayName = 'ShimmerButton';

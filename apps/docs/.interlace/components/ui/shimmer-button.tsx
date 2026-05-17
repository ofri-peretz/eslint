/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
import React, { ComponentPropsWithoutRef, CSSProperties } from "react"

import { cn } from "../../lib/utils"

export interface ShimmerButtonProps extends ComponentPropsWithoutRef<"button"> {
  shimmerColor?: string
  shimmerSize?: string
  borderRadius?: string
  shimmerDuration?: string
  background?: string
  className?: string
  children?: React.ReactNode
  /**
   * Render the rotating spark animation (the conic-gradient that sweeps
   * around the button). Defaults to `true`. Pass `false` to keep the pill
   * geometry and fill but drop the motion.
   */
  shimmer?: boolean
  /**
   * Render the inset white highlight at the bottom edge (a `box-shadow:
   * inset 0 -8px 10px var(--color-shadow-card-inset)` glow). Defaults to
   * `true`. Pass `false`
   * for a darker, flatter look that pairs cleanly with non-white fills.
   * Independent of `shimmer` — the two effects can be toggled separately
   * (e.g. shimmer on + highlight off = animated dark sibling).
   */
  highlight?: boolean
  as?: React.ElementType
}

export const ShimmerButton = React.forwardRef<
  HTMLButtonElement,
  ShimmerButtonProps
>(
  (
    {
      // Defaults resolve to `--color-shimmer` / `--color-shimmer-bg` tokens
      // in `css/brand.css`. Consumers re-skin by redefining the tokens.
      shimmerColor = "var(--color-shimmer)",
      shimmerSize = "0.05em",
      shimmerDuration = "3s",
      borderRadius = "100px",
      background = "var(--color-shimmer-bg)",
      shimmer = true,
      highlight = true,
      className,
      children,
      as: Comp = "button",
      ...props
    },
    ref
  ) => {
    return (
      <Comp
        data-slot="shimmer-button"
        data-shimmer={shimmer ? "" : undefined}
        data-highlight={highlight ? "" : undefined}
        style={
          {
            "--spread": "90deg",
            "--shimmer-color": shimmerColor,
            "--radius": borderRadius,
            "--speed": shimmerDuration,
            "--cut": shimmerSize,
            "--bg": background,
          } as CSSProperties
        }
        className={cn(
          "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden [border-radius:var(--radius)] border border-white/10 px-6 py-3 whitespace-nowrap text-white [background:var(--bg)]",
          "transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
          className
        )}
        ref={ref}
        {...props}
      >
        {/* spark container — gated by `shimmer` prop so secondary CTAs can
            share ShimmerButton's geometry without inheriting its animation */}
        {shimmer && (
          <div
            data-shimmer-spark
            className={cn(
              "-z-30 blur-[2px]",
              "[container-type:size] absolute inset-0 overflow-visible"
            )}
          >
            {/* spark */}
            <div className="animate-shimmer-slide absolute inset-0 [aspect-ratio:1] h-[100cqh] [border-radius:0] [mask:none]">
              {/* spark before */}
              <div className="animate-spin-around absolute -inset-full w-auto [translate:0_0] rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))]" />
            </div>
          </div>
        )}
        {children}

        {/* Inset white highlight at the bottom edge — gated INDEPENDENTLY
            of `shimmer` so secondary CTAs can keep the rotating spark while
            dropping the white inset glow (which clashes with non-white
            fills like the dark slate secondary). */}
        {highlight && (
          <div
            data-shimmer-highlight
            className={cn(
              "absolute inset-0 size-full",

              "rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_var(--color-shadow-card-inset)]",

              // transition
              "transform-gpu transition-all duration-300 ease-in-out",

              // on hover
              "group-hover:shadow-[inset_0_-6px_10px_var(--color-shadow-card-inset)]",

              // on click
              "group-active:shadow-[inset_0_-10px_10px_var(--color-shadow-card-inset)]"
            )}
          />
        )}

        <div
          className={cn(
            "absolute [inset:var(--cut)] -z-20 [border-radius:var(--radius)] [background:var(--bg)]"
          )}
        />
      </Comp>
    )
  }
)

ShimmerButton.displayName = "ShimmerButton"

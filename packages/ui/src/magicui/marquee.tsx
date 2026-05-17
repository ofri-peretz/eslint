"use client";

import { ComponentPropsWithoutRef, useState } from "react";
import { Pause, Play } from "lucide-react";

import { cn } from "../lib/cn.js";
import { useReducedMotion } from "../lib/use-reduced-motion.js";

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * Optional CSS class name to apply custom styles
   */
  className?: string;
  /**
   * Whether to reverse the animation direction
   * @default false
   */
  reverse?: boolean;
  /**
   * Whether to pause the animation on hover
   * @default false
   */
  pauseOnHover?: boolean;
  /**
   * Content to be displayed in the marquee
   */
  children: React.ReactNode;
  /**
   * Whether to animate vertically instead of horizontally
   * @default false
   */
  vertical?: boolean;
  /**
   * Number of times to repeat the content
   * @default 4
   */
  repeat?: number;
  /**
   * Render a visible play/pause button (WCAG 2.2.2 compliance for any
   * marquee that runs longer than 5 seconds). Defaults to true — turn off
   * only when the marquee is wrapped by another control surface that also
   * exposes pause (e.g. a dashboard widget with its own toolbar).
   * @default true
   */
  showPauseControl?: boolean;
  /**
   * Accessible label for the pause/play control. Customize when the marquee
   * has a specific role (e.g. "Pause sponsor logos").
   * @default "Pause scrolling content"
   */
  pauseLabel?: string;
}

/**
 * Marquee — WCAG 2.2.2 (Pause, Stop, Hide) compliant by default.
 *
 * Three layers of motion control:
 *   1. `prefers-reduced-motion: reduce` → animation stops via the global
 *      reset in brand.css; this component also reads the preference and
 *      starts in the paused state so the user sees a static row.
 *   2. `pauseOnHover` → mouse users can pause by hovering.
 *   3. Visible play/pause button → keyboard + screen-reader users get an
 *      explicit control they can reach via Tab.
 */
export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 2, // Performance: Reduced from 4 to 2 (50% fewer DOM nodes)
  showPauseControl = true,
  pauseLabel = "Pause scrolling content",
  ...props
}: MarqueeProps) {
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  // The animation is "running" iff the user hasn't explicitly paused it AND
  // they don't have reduced-motion preference. Reduced motion overrides the
  // user's button click — anything else would re-animate when they don't want it.
  const isAnimating = !paused && !reducedMotion;

  return (
    <div className="relative">
      <div
        {...props}
        className={cn(
          "group flex gap-(--gap) overflow-hidden p-2 [--duration:40s] [--gap:1rem]",
          {
            "flex-row": !vertical,
            "flex-col": vertical,
          },
          className,
        )}
      >
        {Array(repeat)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className={cn("flex shrink-0 justify-around gap-(--gap)", {
                "animate-marquee flex-row": !vertical,
                "animate-marquee-vertical flex-col": vertical,
                "group-hover:[animation-play-state:paused]": pauseOnHover,
                "[animation-direction:reverse]": reverse,
                "[animation-play-state:paused]": !isAnimating,
              })}
            >
              {children}
            </div>
          ))}
      </div>
      {showPauseControl && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={isAnimating ? pauseLabel : `Resume ${pauseLabel.toLowerCase().replace(/^pause /, "")}`}
          aria-pressed={!isAnimating}
          className="absolute right-2 top-2 z-10 inline-flex size-9 items-center justify-center rounded-full border border-fd-border bg-fd-background/80 text-fd-foreground backdrop-blur-sm transition-colors hover:bg-fd-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-ring"
        >
          {isAnimating ? (
            <Pause className="size-4" aria-hidden="true" />
          ) : (
            <Play className="size-4" aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );
}

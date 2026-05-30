/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
"use client";

/**
 * Adapted from Aceternity UI: https://ui.aceternity.com/components/card-hover-effect
 * License: MIT — https://github.com/aceternity-ui (free tier)
 *
 * Tokenized: hardcoded `bg-black` / `text-zinc-*` from the upstream source
 * are replaced with our design tokens (`bg-card`, `text-card-foreground`,
 * `border-border`) so the effect tracks light + dark themes via the
 * existing token system. The motion + layout behavior is unchanged.
 */

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "../../lib/utils";

export interface HoverEffectItem {
  title: string;
  description: string;
  link: string;
}

export interface HoverEffectProps {
  items: ReadonlyArray<HoverEffectItem>;
  className?: string;
}

/**
 * Grid of links where the hovered card gets a soft background that
 * "follows" the cursor via `layoutId` — a single shared motion element
 * animates between positions. Behaves identically under prefers-reduced-
 * motion (motion/react respects the global setting).
 */
export function HoverEffect({ items, className }: HoverEffectProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className={cn(
        "grid grid-cols-1 py-10 md:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item, idx) => (
        <a
          key={item.link}
          href={item.link}
          className="group relative block h-full w-full p-2"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 block h-full w-full rounded-3xl bg-accent/60"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.15 } }}
                exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
              />
            )}
          </AnimatePresence>
          <HoverEffectCard>
            <HoverEffectCardTitle>{item.title}</HoverEffectCardTitle>
            <HoverEffectCardDescription>
              {item.description}
            </HoverEffectCardDescription>
          </HoverEffectCard>
        </a>
      ))}
    </div>
  );
}

export function HoverEffectCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative z-20 h-full w-full overflow-hidden rounded-2xl border border-border bg-card p-4",
        "group-hover:border-foreground/15",
        className,
      )}
    >
      <div className="relative z-50">
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function HoverEffectCardTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h4
      className={cn(
        "mt-4 font-bold tracking-wide text-card-foreground",
        className,
      )}
    >
      {children}
    </h4>
  );
}

export function HoverEffectCardDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "mt-8 text-sm leading-relaxed tracking-wide text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

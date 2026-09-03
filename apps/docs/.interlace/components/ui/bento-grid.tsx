/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * Adapted from Aceternity UI: https://ui.aceternity.com/components/bento-grid
 * License: MIT — https://github.com/aceternity-ui (free tier)
 *
 * Tokenized: hardcoded `border-neutral-200 bg-white dark:bg-black` and
 * `text-neutral-*` from the upstream source are replaced with our
 * design tokens (`border-border`, `bg-card`, `text-card-foreground`,
 * `text-muted-foreground`) so the grid tracks light + dark themes
 * via the existing token system.
 */

import * as React from "react";
import { cn } from "../../lib/utils";

export interface BentoGridProps extends React.ComponentProps<"div"> {
  children?: React.ReactNode;
}

export function BentoGrid({ className, children, ...rest }: BentoGridProps) {
  return (
    <div
      className={cn(
        "mx-auto grid max-w-7xl grid-cols-1 gap-4 md:auto-rows-[18rem] md:grid-cols-3",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface BentoGridItemProps extends Omit<React.ComponentProps<"div">, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
  ...rest
}: BentoGridItemProps) {
  return (
    <div
      className={cn(
        "group/bento row-span-1 flex flex-col justify-between space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm transition duration-200 hover:shadow-xl hover:border-foreground/15",
        className,
      )}
      {...rest}
    >
      {header}
      <div className="transition duration-200 group-hover/bento:translate-x-2">
        {icon}
        <div className="mt-2 mb-2 font-sans font-bold text-card-foreground">
          {title}
        </div>
        <div className="font-sans text-xs font-normal text-muted-foreground">
          {description}
        </div>
      </div>
    </div>
  );
}

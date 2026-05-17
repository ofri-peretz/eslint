/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
"use client";

import { cn } from "#interlace/lib/utils";
import { useEffect, useState } from "react";
import { useReducedMotion } from "#interlace/lib/use-reduced-motion";

interface MeteorsProps {
  number?: number;
  className?: string;
}

interface MeteorMeta {
  top: string;
  left: string;
  animationDelay: string;
  animationDuration: string;
}

export function Meteors({ number = 20, className }: MeteorsProps) {
  const reduced = useReducedMotion();
  const [meteors, setMeteors] = useState<MeteorMeta[]>([]);

  useEffect(() => {
    if (reduced) return;
    setMeteors(
      Array.from({ length: number }, () => ({
        top: "0",
        left: `${Math.floor(Math.random() * 800 - 400)}px`,
        animationDelay: `${(Math.random() * 0.6 + 0.2).toFixed(2)}s`,
        animationDuration: `${Math.floor(Math.random() * 8 + 2)}s`,
      })),
    );
  }, [number, reduced]);

  if (reduced) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {meteors.map((m, idx) => (
        <span
          key={idx}
          className="pointer-events-none absolute left-1/2 top-1/2 h-0.5 w-0.5 rotate-[215deg] animate-meteor rounded-full bg-slate-500 shadow-[0_0_0_1px_var(--color-meteor-glow)] before:absolute before:top-1/2 before:h-px before:w-[50px] before:-translate-y-1/2 before:bg-linear-to-r before:from-slate-500 before:to-transparent before:content-['']"
          style={m}
        />
      ))}
    </div>
  );
}

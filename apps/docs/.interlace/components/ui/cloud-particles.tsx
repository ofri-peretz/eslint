/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
"use client";

import { Particles } from "./particles";
import { cn } from "#interlace/lib/utils";

interface CloudParticlesProps {
  className?: string;
  density?: number;
  /** Hex (without leading "#") used by Particles for color. */
  color?: string;
}

/**
 * Cloud-drift effect — slow, sparse, light-colored particles that drift
 * across the surface like clouds. Built on the synced Particles primitive
 * with tuned defaults: low density, soft color, gentle motion.
 */
export function CloudParticles({
  className,
  density = 40,
  color = "ffffff",
}: CloudParticlesProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
    >
      <Particles
        className="absolute inset-0"
        quantity={density}
        ease={120}
        color={color}
        size={1.5}
        staticity={20}
      />
    </div>
  );
}

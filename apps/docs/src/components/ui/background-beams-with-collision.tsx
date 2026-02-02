"use client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import React, { useRef, useState, useEffect } from "react";

/**
 * Background Beams with Collision Component
 *
 * A dynamic background effect featuring animated beams that fall from the top
 * and create particle explosions when colliding with a surface at the bottom.
 *
 * Adapted from Aceternity UI:
 * https://ui.aceternity.com/components/background-beams-with-collision
 *
 * Theme Support:
 * - Light mode: Purple/indigo beams on a light gradient background
 * - Dark mode: Brighter purple/cyan beams on a dark gradient background
 *
 * @example
 * ```tsx
 * <BackgroundBeamsWithCollision>
 *   <h1>Your Content Here</h1>
 * </BackgroundBeamsWithCollision>
 * ```
 */

// =========================================
// CONFIGURATION - Beam Definitions
// =========================================

/**
 * Default beam configuration - staggered across the viewport
 * Each beam has unique timing and position for visual variety
 */
const DEFAULT_BEAMS: BeamConfig[] = [
  { initialX: 10, translateX: 10, duration: 7, repeatDelay: 3, delay: 2 },
  { initialX: 600, translateX: 600, duration: 3, repeatDelay: 3, delay: 4 },
  { initialX: 100, translateX: 100, duration: 7, repeatDelay: 7, className: "h-6" },
  { initialX: 400, translateX: 400, duration: 5, repeatDelay: 14, delay: 4 },
  { initialX: 800, translateX: 800, duration: 11, repeatDelay: 2, className: "h-20" },
  { initialX: 1000, translateX: 1000, duration: 4, repeatDelay: 2, className: "h-12" },
  { initialX: 1200, translateX: 1200, duration: 6, repeatDelay: 4, delay: 2, className: "h-6" },
];

// =========================================
// TYPES
// =========================================

export interface BeamConfig {
  initialX?: number;
  translateX?: number;
  initialY?: number;
  translateY?: number;
  rotate?: number;
  className?: string;
  duration?: number;
  delay?: number;
  repeatDelay?: number;
}

export interface BackgroundBeamsWithCollisionProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  beams?: BeamConfig[];
  /** When true, hides the visible collision surface at the bottom (useful for full-page backgrounds) */
  hideCollisionSurface?: boolean;
}

interface CollisionState {
  detected: boolean;
  coordinates: { x: number; y: number } | null;
}

// =========================================
// MAIN COMPONENT
// =========================================

export const BackgroundBeamsWithCollision = ({
  children,
  className,
  containerClassName,
  beams = DEFAULT_BEAMS,
  hideCollisionSurface = false,
}: BackgroundBeamsWithCollisionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Pause animations when component is not visible (performance optimization)
  useEffect(() => {
    if (!parentRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    
    observer.observe(parentRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={parentRef}
      className={cn(
        // Base layout
        "relative flex w-full items-center justify-center overflow-hidden",
        // Default height (can be overridden via className)
        "h-96 md:h-[40rem]",
        // Theme-aware background gradient
        // Light mode: Clean white to neutral gradient
        "bg-gradient-to-b from-white to-neutral-100",
        // Dark mode: Deep purple to dark gradient for cosmic feel
        "dark:from-neutral-950 dark:via-purple-950/20 dark:to-neutral-900",
        containerClassName
      )}
      // Performance: CSS containment to reduce layout thrashing
      style={{ contain: 'layout style paint' }}
    >
      {/* Render collision beams - only when visible */}
      {isVisible && beams.map((beam) => (
        <CollisionMechanism
          key={`${beam.initialX}-beam`}
          beamOptions={beam}
          containerRef={containerRef}
          parentRef={parentRef}
        />
      ))}

      {/* Content wrapper */}
      <div className={cn("relative z-10", className)}>{children}</div>

      {/* Collision surface at bottom */}
      <div
        ref={containerRef}
        className={cn(
          "absolute bottom-0 inset-x-0 w-full pointer-events-none",
          // Only show visual styling when not hidden
          !hideCollisionSurface && [
            // Light mode: Subtle neutral with soft shadow
            "bg-neutral-100",
            // Dark mode: Darker surface with purple tint
            "dark:bg-neutral-900/50"
          ]
        )}
        style={hideCollisionSurface ? undefined : {
          boxShadow:
            "0 0 24px rgba(34, 42, 53, 0.06), 0 1px 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(34, 42, 53, 0.04), 0 0 4px rgba(34, 42, 53, 0.08), 0 16px 68px rgba(47, 48, 55, 0.05), 0 1px 0 rgba(255, 255, 255, 0.1) inset",
        }}
      />
    </div>
  );
};

// =========================================
// COLLISION MECHANISM
// =========================================

const CollisionMechanism = React.forwardRef<
  HTMLDivElement,
  {
    containerRef: React.RefObject<HTMLDivElement | null>;
    parentRef: React.RefObject<HTMLDivElement | null>;
    beamOptions?: BeamConfig;
  }
>(({ parentRef, containerRef, beamOptions = {} as BeamConfig }, _ref) => {
  const beamRef = useRef<HTMLDivElement>(null);
  const [collision, setCollision] = useState<CollisionState>({
    detected: false,
    coordinates: null,
  });
  const [beamKey, setBeamKey] = useState(0);
  const [cycleCollisionDetected, setCycleCollisionDetected] = useState(false);

  // Collision detection loop
  useEffect(() => {
    const checkCollision = () => {
      if (
        beamRef.current &&
        containerRef.current &&
        parentRef.current &&
        !cycleCollisionDetected
      ) {
        const beamRect = beamRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const parentRect = parentRef.current.getBoundingClientRect();

        // Detect when beam hits the container surface
        if (beamRect.bottom >= containerRect.top) {
          const relativeX =
            beamRect.left - parentRect.left + beamRect.width / 2;
          const relativeY = beamRect.bottom - parentRect.top;

          setCollision({
            detected: true,
            coordinates: { x: relativeX, y: relativeY },
          });
          setCycleCollisionDetected(true);
        }
      }
    };

    // Performance: Reduced from 50ms to 200ms (75% less CPU usage)
    const animationInterval = setInterval(checkCollision, 200);
    return () => clearInterval(animationInterval);
  }, [cycleCollisionDetected, containerRef, parentRef]);

  // Reset collision after explosion animation
  useEffect(() => {
    if (collision.detected && collision.coordinates) {
      const explosionDuration = 2000;

      setTimeout(() => {
        setCollision({ detected: false, coordinates: null });
        setCycleCollisionDetected(false);
      }, explosionDuration);

      setTimeout(() => {
        setBeamKey((prevKey) => prevKey + 1);
      }, explosionDuration);
    }
  }, [collision]);

  return (
    <>
      {/* Animated beam */}
      <motion.div
        key={beamKey}
        ref={beamRef}
        animate="animate"
        initial={{
          translateY: beamOptions.initialY || "-200px",
          translateX: beamOptions.initialX || "0px",
          rotate: beamOptions.rotate || 0,
        }}
        variants={{
          animate: {
            translateY: beamOptions.translateY || "1800px",
            translateX: beamOptions.translateX || "0px",
            rotate: beamOptions.rotate || 0,
          },
        }}
        transition={{
          duration: beamOptions.duration || 8,
          repeat: Infinity,
          repeatType: "loop",
          ease: "linear",
          delay: beamOptions.delay || 0,
          repeatDelay: beamOptions.repeatDelay || 0,
        }}
        className={cn(
          // Base beam styling
          "absolute left-0 top-20 m-auto h-14 w-px rounded-full",
          // Light mode: Indigo/purple gradient beam
          "bg-gradient-to-t from-indigo-500 via-purple-500 to-transparent",
          // Dark mode: Brighter, more vibrant beam
          "dark:from-cyan-400 dark:via-purple-400 dark:to-transparent",
          beamOptions.className
        )}
      />

      {/* Explosion effect on collision */}
      <AnimatePresence>
        {collision.detected && collision.coordinates && (
          <Explosion
            key={`${collision.coordinates.x}-${collision.coordinates.y}`}
            style={{
              left: `${collision.coordinates.x}px`,
              top: `${collision.coordinates.y}px`,
              transform: "translate(-50%, -50%)",
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
});

CollisionMechanism.displayName = "CollisionMechanism";

// =========================================
// EXPLOSION EFFECT
// =========================================

/**
 * Particle explosion animation that triggers on beam collision
 * Performance: Reduced from 20 to 10 particles for 50% less motion overhead
 */
const Explosion = ({ ...props }: React.HTMLProps<HTMLDivElement>) => {
  // Generate particles with random directions using lazy state initializer
  // This ensures random values are only generated once on mount, not during render
  const [spans] = React.useState(() =>
    Array.from({ length: 10 }, (_, index) => ({
      id: index,
      initialX: 0,
      initialY: 0,
      directionX: Math.floor(Math.random() * 80 - 40),
      directionY: Math.floor(Math.random() * -50 - 10),
      duration: Math.random() * 1.5 + 0.5,
    }))
  );

  return (
    <div {...props} className={cn("absolute z-50 h-2 w-2", props.className)}>
      {/* Horizontal glow line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className={cn(
          "absolute -inset-x-10 top-0 m-auto h-2 w-10 rounded-full blur-sm",
          // Light mode: Indigo glow
          "bg-gradient-to-r from-transparent via-indigo-500 to-transparent",
          // Dark mode: Cyan/purple glow
          "dark:via-cyan-400"
        )}
      />

      {/* Scattered particles */}
      {spans.map((span) => (
        <motion.span
          key={span.id}
          initial={{ x: span.initialX, y: span.initialY, opacity: 1 }}
          animate={{
            x: span.directionX,
            y: span.directionY,
            opacity: 0,
          }}
          transition={{
            duration: span.duration,
            ease: "easeOut",
          }}
          className={cn(
            "absolute h-1 w-1 rounded-full",
            // Light mode: Indigo/purple particles
            "bg-gradient-to-b from-indigo-500 to-purple-500",
            // Dark mode: Cyan/purple particles
            "dark:from-cyan-400 dark:to-purple-400"
          )}
        />
      ))}
    </div>
  );
};

export default BackgroundBeamsWithCollision;

"use client";
import { cn } from "@/lib/utils";
import React, { useState, useEffect, useRef, useCallback } from "react";

interface StarProps {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  twinkleSpeed: number | null;
}

interface StarBackgroundProps {
  starDensity?: number;
  allStarsTwinkle?: boolean;
  twinkleProbability?: number;
  minTwinkleSpeed?: number;
  maxTwinkleSpeed?: number;
  className?: string;
}

export const StarsBackground: React.FC<StarBackgroundProps> = ({
  starDensity = 0.00015,
  allStarsTwinkle = true,
  twinkleProbability = 0.7,
  minTwinkleSpeed = 0.5,
  maxTwinkleSpeed = 1,
  className,
}) => {
  const [stars, setStars] = useState<StarProps[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Pause animations when not visible (performance optimization)
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  const generateStars = useCallback(
    (width: number, height: number): StarProps[] => {
      const area = width * height;
      const numStars = Math.floor(area * starDensity);
      return Array.from({ length: numStars }, () => {
        const shouldTwinkle =
          allStarsTwinkle || Math.random() < twinkleProbability;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 0.05 + 0.5,
          opacity: Math.random() * 0.5 + 0.5,
          twinkleSpeed: shouldTwinkle
            ? minTwinkleSpeed +
              Math.random() * (maxTwinkleSpeed - minTwinkleSpeed)
            : null,
        };
      });
    },
    [
      starDensity,
      allStarsTwinkle,
      twinkleProbability,
      minTwinkleSpeed,
      maxTwinkleSpeed,
    ]
  );

  useEffect(() => {
    // Copy ref to local variable to avoid stale ref in cleanup
    const canvas = canvasRef.current;
    
    const updateStars = () => {
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;
        setStars(generateStars(width, height));
      }
    };

    updateStars();

    const resizeObserver = new ResizeObserver(updateStars);
    if (canvas) {
      resizeObserver.observe(canvas);
    }

    return () => {
      if (canvas) {
        resizeObserver.unobserve(canvas);
      }
    };
  }, [
    starDensity,
    allStarsTwinkle,
    twinkleProbability,
    minTwinkleSpeed,
    maxTwinkleSpeed,
    generateStars,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Only render when visible (performance optimization)
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Performance: Calculate time once per frame, not per star
      const time = performance.now() * 0.001;
      stars.forEach((star) => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();

        if (star.twinkleSpeed !== null) {
          star.opacity =
            0.5 +
            Math.abs(Math.sin(time / star.twinkleSpeed) * 0.5);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [stars, isVisible]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("h-full w-full absolute inset-0 will-change-transform", className)}
      suppressHydrationWarning
    />
  );
};

interface ShootingStarProps {
  minSpeed?: number;
  maxSpeed?: number;
  minDelay?: number;
  maxDelay?: number;
  starColor?: string;
  trailColor?: string;
  starWidth?: number;
  starHeight?: number;
  className?: string;
}

export const ShootingStars: React.FC<ShootingStarProps> = ({
  minSpeed = 10,
  maxSpeed = 30,
  minDelay = 1200,
  maxDelay = 4200,
  starColor = "#9E00FF",
  trailColor = "#2EB9DF",
  starWidth = 10,
  starHeight = 1,
  className,
}) => {
  const [star, setStar] = useState<{
    x: number;
    y: number;
    angle: number;
    scale: number;
    speed: number;
    distance: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Performance: Pre-compute trig values for fixed 215° angle
  const angleRad = (215 * Math.PI) / 180;
  const cosAngle = Math.cos(angleRad);
  const sinAngle = Math.sin(angleRad);

  // Pause animations when not visible (performance optimization)
  useEffect(() => {
    if (!svgRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    
    observer.observe(svgRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Don't create new stars if not visible
    if (!isVisible) return;

    const createStar = () => {
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const newStar = {
        x: Math.random() * rect.width,
        y: 0,
        angle: 215,
        scale: 1,
        speed: Math.random() * (maxSpeed - minSpeed) + minSpeed,
        distance: 0,
      };
      setStar(newStar);

      const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;
      setTimeout(createStar, randomDelay);
    };

    createStar();
  }, [minSpeed, maxSpeed, minDelay, maxDelay, isVisible]);

  useEffect(() => {
    if (!star) return;

    let animationFrameId: number;

    const moveStar = () => {
      setStar((prevStar) => {
        if (!prevStar) return null;

        // Performance: Use pre-computed trig values
        const newX = prevStar.x + prevStar.speed * cosAngle;
        const newY = prevStar.y + prevStar.speed * sinAngle;
        const newDistance = prevStar.distance + prevStar.speed;

        const svg = svgRef.current;
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();

        if (
          newX < -20 ||
          newX > rect.width + 20 ||
          newY < -20 ||
          newY > rect.height + 20
        ) {
          return null;
        }

        return {
          ...prevStar,
          x: newX,
          y: newY,
          distance: newDistance,
        };
      });

      animationFrameId = requestAnimationFrame(moveStar);
    };

    moveStar();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [star, cosAngle, sinAngle]);

  return (
    <svg ref={svgRef} className={cn("w-full h-full absolute inset-0 pointer-events-none", className)}>
      {star && (
        <rect
          x={star.x}
          y={star.y}
          width={starWidth * star.scale}
          height={starHeight}
          fill="url(#gradient)"
          transform={`rotate(${star.angle}, ${
            star.x + (starWidth * star.scale) / 2
          }, ${star.y + starHeight / 2})`}
        />
      )}
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: trailColor, stopOpacity: 0 }} />
          <stop
            offset="100%"
            style={{ stopColor: starColor, stopOpacity: 1 }}
          />
        </linearGradient>
      </defs>
    </svg>
  );
};

interface MeteorsProps {
  /** Number of meteors to display */
  number?: number;
  /** Minimum animation duration in seconds */
  minDuration?: number;
  /** Maximum animation duration in seconds */
  maxDuration?: number;
  /** Meteor color */
  meteorColor?: string;
  /** Trail color (gradient start) */
  trailColor?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Meteors component - Aceternity-inspired falling meteor effect
 * Uses pure CSS animations for optimal performance (no Framer Motion)
 * Follows the project's CSS Animation Shift pattern
 * 
 * Note: Meteors only render after client-side mount to prevent hydration mismatches
 */
export const Meteors: React.FC<MeteorsProps> = ({
  number = 3,
  minDuration = 12,
  maxDuration = 30,
  meteorColor = "#e9d5ff",
  trailColor = "transparent",
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Only render meteors after client-side mount to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Generate meteor positions deterministically using lazy initializer
  const [meteors] = useState(() =>
    Array.from({ length: number }, (_, idx) => {
      // Distribute meteors across a wider viewport area (1600px range centered)
      const position = idx * (1600 / number) - 800;
      // Use index-based pseudo-random values for consistent positioning
      const seed = (idx * 13 + 7) % 100;
      // Longer delay range (0-20s) for less frequent meteor appearance
      const delay = (seed / 100) * 20;
      const duration = minDuration + ((seed / 100) * (maxDuration - minDuration));

      return {
        id: idx,
        position,
        delay,
        duration,
        angle: 215, // Fixed angle for clean, consistent look
      };
    })
  );

  // Pause animations when not visible (performance optimization)
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Component-level CSS for meteor animation (avoiding global.css dependency)
  const meteorStyles = `
    @keyframes meteor-effect {
      0% {
        transform: rotate(var(--meteor-angle, 215deg)) translateX(0);
        opacity: 1;
      }
      70% {
        opacity: 1;
      }
      100% {
        transform: rotate(var(--meteor-angle, 215deg)) translateX(-500px);
        opacity: 0;
      }
    }
    .animate-meteor-effect {
      animation: meteor-effect var(--meteor-duration, 5s) linear infinite;
      animation-delay: var(--meteor-delay, 0s);
    }
  `;

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none",
        className
      )}
      suppressHydrationWarning
    >
      {/* Inject component-scoped CSS only on client to prevent hydration mismatch */}
      {isMounted && <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: meteorStyles }} />}
      {/* Only render meteors after client mount to prevent hydration mismatch */}
      {isMounted && meteors.map((meteor) => (
        <span
          key={`meteor-${meteor.id}`}
          className="animate-meteor-effect absolute"
          style={{
            top: "-40px",
            left: `calc(50% + ${meteor.position}px)`,
            // Longer, thinner tail for realistic meteor trail
            width: "120px",
            height: "1px",
            // Bright head fading to transparent tail
            background: `linear-gradient(90deg, ${meteorColor} 0%, ${meteorColor}80 10%, transparent 100%)`,
            opacity: 0.8,
            // Very subtle glow for thin, delicate meteor look
            boxShadow: `0 0 2px 0px ${meteorColor}50`,
            borderRadius: "9999px",
            ["--meteor-angle" as string]: `${meteor.angle}deg`,
            ["--meteor-delay" as string]: `${meteor.delay}s`,
            ["--meteor-duration" as string]: `${meteor.duration}s`,
            animationPlayState: isVisible ? "running" : "paused",
          }}
        />
      ))}
    </div>
  );
};

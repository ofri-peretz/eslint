"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { flushSync } from "react-dom";
import dynamic from 'next/dynamic';
const MotionDiv = dynamic(() => import('motion/react').then(m => m.motion.div), { ssr: false });
const AnimatePresence = dynamic(() => import('motion/react').then(m => m.AnimatePresence), { ssr: false });
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number;
}

export const AnimatedThemeToggler = ({
  className,
  duration = 0.4,
  ...props
}: AnimatedThemeTogglerProps) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  const toggleTheme = useCallback(async () => {
    if (!buttonRef.current) return;

    const newTheme = isDark ? "light" : "dark";
    
    // Check if the browser supports startViewTransition
    if (!document.startViewTransition) {
      setTheme(newTheme);
      return;
    }

    await document.startViewTransition(() => {
      flushSync(() => {
        setTheme(newTheme);
      });
    }).ready;

    const { top, left, width, height } = buttonRef.current.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const maxRadius = Math.hypot(
      Math.max(left, window.innerWidth - left),
      Math.max(top, window.innerHeight - top)
    );

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: duration * 1000,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  }, [isDark, setTheme, duration]);

  if (!mounted) {
    return (
      <div className={cn("h-9 w-9 rounded-lg border border-fd-border bg-fd-card", className)} />
    );
  }

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-lg border border-fd-border bg-fd-card text-fd-foreground hover:bg-fd-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring",
        className
      )}
      style={{ cursor: "pointer" } as any}
      aria-label="Toggle theme"
      {...props}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <MotionDiv
            key="moon"
            initial={{ scale: 0.5, opacity: 0, rotate: 90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: -90 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="flex items-center justify-center pointer-events-none"
          >
            <Moon className="h-5 w-5" />
          </MotionDiv>
        ) : (
          <MotionDiv
            key="sun"
            initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="flex items-center justify-center pointer-events-none"
          >
            <Sun className="h-5 w-5" />
          </MotionDiv>
        )}
      </AnimatePresence>
    </button>
  );
};

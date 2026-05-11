/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
"use client"

import { ComponentPropsWithoutRef, useCallback, useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  startValue?: number
  direction?: "up" | "down"
  delay?: number
  decimalPlaces?: number
  /** Duration of animation in ms (default: 1500) */
  duration?: number
}

/**
 * NumberTicker - Performance Optimized
 * 
 * Uses requestAnimationFrame + easeOutExpo instead of Framer Motion springs.
 * This reduces the JS bundle size and eliminates the motion/react dependency
 * for a simple counting animation.
 */
export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  duration = 1500,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [hasAnimated, setHasAnimated] = useState(false)
  
  // Format number with locale (memoized to prevent useEffect recreation)
  const formatNumber = useCallback((num: number) => 
    Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(Number(num.toFixed(decimalPlaces))), [decimalPlaces])

  useEffect(() => {
    if (!ref.current || hasAnimated) return

    // IntersectionObserver to trigger when in view
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          
          const startTime = Date.now() + delay * 1000
          const from = direction === "down" ? value : startValue
          const to = direction === "down" ? startValue : value
          
          const animate = () => {
            const now = Date.now()
            if (now < startTime) {
              requestAnimationFrame(animate)
              return
            }
            
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)
            
            // Ease out expo for smooth deceleration
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
            const current = from + (to - from) * eased
            
            if (ref.current) {
              ref.current.textContent = formatNumber(current)
            }
            
            if (progress < 1) {
              requestAnimationFrame(animate)
            }
          }
          
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value, startValue, direction, delay, duration, decimalPlaces, hasAnimated, formatNumber])

  return (
    <span
      ref={ref}
      className={cn(
        // Use the foreground token so the ticker tracks the theme. Hardcoding
        // `text-black dark:text-white` would diverge if a consumer overrides
        // `--color-fd-foreground`. The token is the single source of truth.
        "inline-block tracking-wider text-fd-foreground tabular-nums",
        className
      )}
      {...props}
    >
      {formatNumber(startValue)}
    </span>
  )
}

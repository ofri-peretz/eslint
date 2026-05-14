'use client';

import * as React from 'react';

import { cn } from '../lib/cn.js';

/**
 * macOS-style code-window chrome — a shadcn-conventional `data-slot`-tagged
 * component for wrapping editor / terminal / code-preview content with a
 * polished IDE aesthetic.
 *
 * The chrome consists of:
 *   - A title bar (`<CodeWindowTitleBar>`) with the three macOS traffic-light
 *     dots (decorative — `aria-hidden`, the title slot carries the
 *     accessible name) and an optional title slot.
 *   - The body — anything you nest inside `<CodeWindow>` after the title bar.
 *
 * The styling is intentionally light: a subtle border, modest shadow,
 * and rounded corners. The dots use the same colors macOS ships in its
 * window controls (`#FF5F57` / `#FEBC2E` / `#28C840`) so the chrome reads
 * as "code window" at a glance.
 *
 * Modeled on MagicUI's `Terminal` chrome (the dots + bar layout convention)
 * but reduced to the visual primitive — no animation, no terminal-specific
 * line emitter. Use this when you want a window-shaped container; reach
 * for `Terminal` from MagicUI when you want a terminal-prompt animation.
 *
 * Example:
 *
 * ```tsx
 * <CodeWindow>
 *   <CodeWindowTitleBar title="example.ts" />
 *   <MyEditor />
 * </CodeWindow>
 * ```
 */
function CodeWindow({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="code-window"
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-card shadow-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CodeWindowTitleBarProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  /**
   * Optional title to display in the bar (typically a filename or rule id).
   * If omitted, the bar renders just the traffic-light dots — leaner for
   * cases where a separate header already names the content. Typed as
   * `ReactNode` (not the native HTML `title` attribute) so callers can
   * pass JSX such as a styled filename.
   */
  title?: React.ReactNode;
  /**
   * Optional trailing slot (right-aligned). Useful for a "copy" button or
   * a status indicator. Renders inside the title-bar row.
   */
  actions?: React.ReactNode;
}

function CodeWindowTitleBar({
  className,
  title,
  actions,
  ...props
}: CodeWindowTitleBarProps) {
  return (
    <div
      data-slot="code-window-title-bar"
      className={cn(
        'flex items-center gap-3 border-b border-border bg-muted/50 px-3 py-2',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        data-slot="code-window-traffic-lights"
        className="flex items-center gap-1.5"
      >
        <span className="size-3 rounded-full bg-[#FF5F57]" />
        <span className="size-3 rounded-full bg-[#FEBC2E]" />
        <span className="size-3 rounded-full bg-[#28C840]" />
      </span>
      {title && (
        <span className="flex-1 truncate text-center font-mono text-xs text-muted-foreground">
          {title}
        </span>
      )}
      {actions && (
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {actions}
        </span>
      )}
    </div>
  );
}

export { CodeWindow, CodeWindowTitleBar };
export type { CodeWindowTitleBarProps };

'use client';

import { useRef, useCallback, useEffect, type KeyboardEvent } from 'react';
import { Button } from '@interlace/ui/button';
import type { PlaygroundSnippet } from './snippets';

export interface ExamplePickerProps {
  snippets: readonly PlaygroundSnippet[];
  currentSlug: string;
  onSelect: (slug: string) => void;
}

/**
 * Cmd+K / Ctrl+K — focus the example picker and select the current tab.
 * Matches the global "command palette" idiom users carry over from
 * Linear, Vercel, Stripe Dashboard, GitHub. Doesn't open a modal — just
 * jumps focus to the active picker so arrow keys take over immediately.
 */
function useCmdKShortcut(focusActiveTab: () => void) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent | globalThis.KeyboardEvent) => {
      // Don't fire while typing in an input — but DO fire from the editor
      // because cmd+k is a known "global" shortcut, not an editor shortcut.
      const target = e.target as HTMLElement | null;
      const isFormInput =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isCmdK && !isFormInput) {
        e.preventDefault();
        focusActiveTab();
      }
    };
    window.addEventListener('keydown', onKeyDown as EventListener);
    return () => window.removeEventListener('keydown', onKeyDown as EventListener);
  }, [focusActiveTab]);
}

/**
 * Example picker — desktop button strip / mobile native select.
 *
 * Implements roving-tabindex keyboard navigation manually because the
 * shadcn `Tabs` primitive's segmented-control aesthetic (h-9 pill on
 * `bg-muted`) doesn't accommodate our six long mono-font snippet names.
 * The arrow-key + Home/End contract here matches `Tabs`'s, so a future
 * switch to the primitive is mechanical.
 *
 * Mobile uses a native `<select>` per `PLAYGROUND_SPEC.md` § Mobile —
 * the native picker is faster than a custom dropdown on touch.
 */
export function ExamplePicker({ snippets, currentSlug, onSelect }: ExamplePickerProps) {
  const listRef = useRef<HTMLDivElement | null>(null);

  const focusActiveTab = useCallback(() => {
    const active = listRef.current?.querySelector<HTMLButtonElement>(
      'button[role="tab"][aria-selected="true"]',
    );
    active?.focus();
  }, []);

  useCmdKShortcut(focusActiveTab);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const focusable = Array.from(
        listRef.current?.querySelectorAll<HTMLButtonElement>('button[role="tab"]') ?? [],
      );
      const currentIndex = focusable.findIndex((el) => el === document.activeElement);
      if (currentIndex < 0) return;

      let nextIndex = currentIndex;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = (currentIndex + 1) % focusable.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = (currentIndex - 1 + focusable.length) % focusable.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = focusable.length - 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      const next = focusable[nextIndex];
      next.focus();
      onSelect(next.dataset.slug ?? snippets[nextIndex].slug);
    },
    [onSelect, snippets],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-wider text-fd-muted-foreground">
          Pick an example
        </p>
        <p
          className="hidden font-mono text-[10px] uppercase tracking-wider text-fd-muted-foreground md:inline-flex"
          aria-hidden
        >
          <kbd className="rounded border border-fd-border bg-fd-card px-1.5 py-0.5">⌘K</kbd>
          <span className="px-1 opacity-60">/</span>
          <kbd className="rounded border border-fd-border bg-fd-card px-1.5 py-0.5">Ctrl+K</kbd>
          <span className="ml-1.5 normal-case tracking-normal text-fd-muted-foreground/70">
            to focus the picker
          </span>
        </p>
      </div>

      {/* Desktop: button strip with arrow-key roving-tabindex */}
      <div
        ref={listRef}
        role="tablist"
        aria-label="Flagship rule examples"
        onKeyDown={handleKeyDown}
        className="hidden flex-wrap gap-2 md:flex"
      >
        {snippets.map((s) => {
          const selected = s.slug === currentSlug;
          return (
            <Button
              key={s.slug}
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              data-slug={s.slug}
              variant={selected ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelect(s.slug)}
              className="font-mono text-xs"
            >
              {s.title}
            </Button>
          );
        })}
      </div>

      {/* Mobile: native select */}
      <label className="flex flex-col gap-1 md:hidden">
        <span className="sr-only">Pick an example</span>
        <select
          value={currentSlug}
          onChange={(e) => onSelect(e.target.value)}
          className="rounded-md border border-fd-border bg-fd-card px-3 py-2 text-sm text-fd-foreground"
        >
          {snippets.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.title}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

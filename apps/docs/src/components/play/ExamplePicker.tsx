'use client';

import { useRef, useCallback, type KeyboardEvent } from 'react';
import { Button } from '@interlace/ui/button';
import type { PlaygroundSnippet } from './snippets';

export interface ExamplePickerProps {
  snippets: readonly PlaygroundSnippet[];
  currentSlug: string;
  onSelect: (slug: string) => void;
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
      <p className="font-mono text-xs uppercase tracking-wider text-fd-muted-foreground">
        Pick an example
      </p>

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

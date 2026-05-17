'use client';

import { Check, Copy } from 'lucide-react';
import { Button } from '@interlace/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@interlace/ui/tooltip';
import { cn } from '@interlace/ui/cn';

export interface PluginToggleStripProps {
  plugins: readonly string[];
  /** The set of plugins currently visible. Membership = enabled. */
  enabled: ReadonlySet<string>;
  onToggle: (prefix: string) => void;
  /** Triggered by the Copy-eslint.config.js button. */
  onCopyConfig: () => void;
  /** Transient UI flag — the button shows a Check ✓ for 2s after click. */
  copied: boolean;
}

/**
 * Plugin toggle strip — Phase 1c affordance.
 *
 * Each chip is a shadcn `Button variant="outline" size="sm" rounded-full`
 * with `aria-pressed` reflecting the toggle state. Pressed chips render
 * with a primary tint; un-pressed chips are strike-through with reduced
 * opacity that *brightens* on hover (the previous bespoke build had a
 * dead hover on disabled chips).
 *
 * The Copy-eslint.config.js button sits at the strip's right edge and
 * is wrapped in a Tooltip explaining what the copied snippet contains.
 */
export function PluginToggleStrip({
  plugins,
  enabled,
  onToggle,
  onCopyConfig,
  copied,
}: PluginToggleStripProps) {
  if (plugins.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-wider text-fd-muted-foreground">
          Plugins enabled · {enabled.size}/{plugins.length}
        </p>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                onClick={onCopyConfig}
                aria-live="polite"
                disabled={enabled.size === 0}
                className="font-mono text-xs uppercase tracking-wider"
              >
                {copied ? (
                  <>
                    <Check aria-hidden />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy aria-hidden />
                    Copy eslint.config.js
                  </>
                )}
              </Button>
            }
          />
          <TooltipContent>
            Copy an `eslint.config.js` that imports each enabled plugin and
            spreads its `configs.flagship` preset.
          </TooltipContent>
        </Tooltip>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label="Plugin toggle strip">
        {plugins.map((prefix) => {
          const isEnabled = enabled.has(prefix);
          return (
            <li key={prefix}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggle(prefix)}
                aria-pressed={isEnabled}
                className={cn(
                  'rounded-full font-mono text-xs',
                  isEnabled
                    ? 'border-fd-primary bg-fd-primary/10 text-fd-foreground hover:bg-fd-primary/20'
                    : 'text-fd-muted-foreground line-through opacity-70 hover:opacity-100 hover:text-fd-foreground hover:no-underline',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'inline-block size-2 rounded-full transition-colors',
                    isEnabled ? 'bg-fd-primary' : 'bg-fd-muted-foreground/40',
                  )}
                />
                {prefix}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

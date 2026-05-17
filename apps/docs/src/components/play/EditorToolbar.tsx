'use client';

import { Play, RotateCcw } from 'lucide-react';
import { Button } from '@interlace/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@interlace/ui/tooltip';

export interface EditorToolbarProps {
  /** True when the editor buffer differs from the canonical snippet. */
  isEdited: boolean;
  onReset: () => void;
}

/**
 * EditorToolbar — the row above the Monaco editor.
 *
 * Holds the "Code · editable" label, the Reset button (only when the
 * buffer has drifted from the canonical snippet), and the disabled
 * "Run · Phase 2" placeholder wrapped in a Tooltip that names the
 * gated Phase 2 work (oxlint WASM + JS plugins).
 *
 * The disabled state is honest: the button sits in the layout slot
 * where the live affordance will be, but never lies about being
 * functional today.
 */
export function EditorToolbar({ isEdited, onReset }: EditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="font-mono text-xs uppercase tracking-wider text-fd-muted-foreground">
        Code · editable
      </p>
      <div className="flex items-center gap-1.5">
        {isEdited && (
          <Button
            variant="ghost"
            size="xs"
            onClick={onReset}
            className="font-mono uppercase tracking-wider"
          >
            <RotateCcw aria-hidden />
            Reset
          </Button>
        )}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="xs"
                disabled
                className="font-mono uppercase tracking-wider"
              >
                <Play aria-hidden />
                Run · Phase 2
              </Button>
            }
          />
          <TooltipContent>
            Live linting arrives in Phase 2 (oxlint WASM + our rules as
            JS plugins). For now the right pane shows the verified
            static findings.
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

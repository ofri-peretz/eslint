'use client';

import { RotateCcw } from 'lucide-react';
import { Button } from '@interlace/ui/button';
export interface EditorToolbarProps {
  /** True when the editor buffer differs from the canonical snippet. */
  isEdited: boolean;
  onReset: () => void;
}

/**
 * EditorToolbar — the row above the Monaco editor.
 *
 * Holds the "Code · editable" label, the Reset button (only when the
 * buffer has drifted from the canonical snippet), and the lints-as-you-type
 * hint. There is deliberately NO Run button: linting is automatic (see
 * useLiveLinting), and a button implying a manual step would misdescribe
 * the product. Its predecessor — a disabled run-button placeholder gated on
 * an internal roadmap milestone — outlived that milestone and shipped the
 * roadmap's jargon to visitors.
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
        <p className="font-mono text-[10px] uppercase tracking-wider text-fd-muted-foreground">
          Lints as you type
        </p>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { AlertTriangle, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@interlace/ui/badge';
import type { PlaygroundFinding } from './snippets';
import type { LintStatus } from '@/lib/playground/useLiveLinting';

export interface FindingsListProps {
  findings: readonly PlaygroundFinding[];
  /** @deprecated Phase 2: live linting supersedes the edited state; kept for API compatibility. */
  isEdited?: boolean;
  /** Number of findings hidden by the active plugin filter, for the header label. */
  hiddenCount: number;
  /** Total findings on the canonical snippet; used to differentiate "no findings"
   *  from "all-plugins-disabled". */
  totalCount: number;
  /** Phase 2: current lint status from useLiveLinting. */
  lintStatus?: LintStatus;
}

/**
 * Right-pane findings list — the playground's output surface.
 *
 * Three states:
 *  - **Edited**: editor buffer ≠ snippet. Render an explicit
 *    "edited, live linting pending" placeholder rather than a stale
 *    list of canonical-snippet findings. (Phase 2 will replace this
 *    with live in-browser output.)
 *  - **Filtered to zero**: snippet has findings but all are hidden by
 *    the active plugin filter. Suggest toggling a plugin back on.
 *  - **Active list**: render each finding via `FindingCard`.
 */
export function FindingsList({ findings, hiddenCount, totalCount, lintStatus }: FindingsListProps) {
  const isLinting = lintStatus === 'linting';

  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-xs uppercase tracking-wider text-fd-muted-foreground">
        {isLinting ? (
          <span className="flex items-center gap-1.5">
            <Loader2 aria-hidden className="size-3 animate-spin" />
            Linting…
          </span>
        ) : (
          <>
            Findings · {findings.length}
            {hiddenCount > 0 && (
              <span className="ml-1 normal-case tracking-normal text-fd-muted-foreground/70">
                ({hiddenCount} hidden by plugin filter)
              </span>
            )}
          </>
        )}
      </p>

      {isLinting && findings.length === 0 ? (
        <LintingSkeleton />
      ) : findings.length === 0 ? (
        <EmptyState
          message={
            totalCount === 0
              ? 'No findings yet — paste code or pick an example.'
              : 'All plugins disabled for this example — toggle one back on to see its findings.'
          }
        />
      ) : (
        <ol className="flex flex-col gap-2" aria-label="ESLint findings for this snippet">
          {findings.map((f, i) => (
            <FindingCard
              key={`${f.ruleId}-${f.line}-${f.column}-${i}`}
              finding={f}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

/** Shown while the first lint result is in-flight. */
function LintingSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy aria-label="Linting in progress">
      <div className="h-[88px] animate-pulse rounded-md border border-fd-border bg-fd-card/50 opacity-75" />
      <div className="h-[88px] animate-pulse rounded-md border border-fd-border bg-fd-card/50 opacity-50" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-fd-border bg-fd-card/50 p-6 text-center text-sm text-fd-muted-foreground">
      <Sparkles aria-hidden className="size-5 opacity-50" />
      {message}
    </div>
  );
}

function FindingCard({ finding: f }: { finding: PlaygroundFinding }) {
  return (
    <li className="flex flex-col gap-2 rounded-md border border-fd-border bg-fd-card p-3 transition-colors hover:border-fd-primary/40 hover:bg-fd-accent/20">
      <div className="flex flex-wrap items-start gap-2">
        <Badge
          variant={f.severity === 'error' ? 'destructive' : 'secondary'}
          className="text-[10px] uppercase tracking-wide"
        >
          <AlertTriangle aria-hidden />
          {f.severity}
        </Badge>
        <Link
          href={f.ruleDocsPath}
          className="font-mono text-sm text-fd-foreground hover:text-fd-primary hover:underline"
        >
          {f.ruleId}
        </Link>
        <span className="ml-auto font-mono text-xs text-fd-muted-foreground">
          {f.line}:{f.column}
        </span>
      </div>
      <p className="text-sm text-fd-foreground">{f.message}</p>
      <Link
        href={f.ruleDocsPath}
        className="inline-flex items-center gap-1 self-start font-mono text-xs text-fd-muted-foreground hover:text-fd-primary hover:underline"
      >
        Read the rule
        <ExternalLink aria-hidden className="size-3" />
      </Link>
    </li>
  );
}

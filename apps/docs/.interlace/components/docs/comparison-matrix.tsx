/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * ComparisonMatrix — Server Component rendering the canonical "vs community" table.
 *
 * Reads a hand-authored JSON file with one row per capability, citing either
 * the community plugin's source line or the npm metadata that backs the claim.
 * The same data file backs:
 *
 *   - `<ComparisonMatrix slug="..." rows="headline" />` — top-level pitch (plugin index page)
 *   - `<ComparisonMatrix slug="..." rows="all" />` — full migration matrix
 *
 * Default data path (relative to consumer cwd):
 *   `apps/docs/src/data/comparisons/<slug>.json`
 *
 * Override via `dataPath` prop or `NEXT_PUBLIC_INTERLACE_COMPARISONS_DIR`.
 *
 * Wins/losses use the `interlace` and `community` fields (free-form strings)
 * with optional `verdict`: `win` | `loss` | `tie`. The `headline` boolean
 * controls whether the row appears in `rows="headline"` mode.
 *
 * Usage:
 *   <ComparisonMatrix slug="api-gateway-caching" rows="headline" />
 *   <ComparisonMatrix slug="api-gateway-caching" rows="all" />
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export type ComparisonVerdict = 'win' | 'loss' | 'tie';

export interface ComparisonRow {
  /** Capability description shown in the first column. */
  capability: string;
  /** Community-plugin column — short text or emoji + note. */
  community: string;
  /** Interlace column — short text or emoji + note. */
  interlace: string;
  /** Optional source-line citation surfaced in the rendered table footnote. */
  citation?: string;
  /** `win` highlights interlace, `loss` highlights community, `tie` neutral. */
  verdict?: ComparisonVerdict;
  /** When `true`, row appears in headline mode. */
  headline?: boolean;
}

export interface ComparisonData {
  slug: string;
  interlaceName: string;
  communityName: string;
  rows: ComparisonRow[];
}

export interface ComparisonMatrixProps {
  /** Plugin slug used to resolve `apps/docs/src/data/comparisons/<slug>.json`. */
  slug?: string;
  /** Explicit path override. */
  dataPath?: string;
  /** Inline data. */
  data?: ComparisonData;
  /** `headline` shows only `headline: true` rows; `all` shows everything. Default: `all`. */
  rows?: 'headline' | 'all';
}

async function loadComparison(props: ComparisonMatrixProps): Promise<ComparisonData | null> {
  if (props.data) return props.data;
  const baseDir =
    process.env.NEXT_PUBLIC_INTERLACE_COMPARISONS_DIR ?? 'apps/docs/src/data/comparisons';
  const path =
    props.dataPath ?? (props.slug ? `${baseDir}/${props.slug}.json` : null);
  if (!path) {
    throw new Error('ComparisonMatrix: provide `slug`, `dataPath`, or `data`.');
  }
  const absolute = path.startsWith('/') ? path : resolve(process.cwd(), path);
  try {
    const raw = await readFile(absolute, 'utf8');
    return JSON.parse(raw) as ComparisonData;
  } catch {
    return null;
  }
}

function rowClass(verdict: ComparisonVerdict | undefined): string {
  if (verdict === 'win') return 'bg-fd-primary/5';
  if (verdict === 'loss') return 'bg-amber-500/5';
  return '';
}

export async function ComparisonMatrix(props: ComparisonMatrixProps) {
  const data = await loadComparison(props);
  if (!data) {
    return <ComparisonPending slug={props.slug} />;
  }
  const rows =
    props.rows === 'headline'
      ? data.rows.filter((r) => r.headline === true)
      : data.rows;

  if (rows.length === 0) {
    return (
      <p className="my-4 text-sm text-fd-muted-foreground">
        <em>No {props.rows ?? 'all'} rows defined for {data.slug}.</em>
      </p>
    );
  }

  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-fd-border">
      <table className="w-full text-sm">
        <thead className="bg-fd-card">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Capability</th>
            <th className="px-3 py-2 text-left font-medium">{data.communityName}</th>
            <th className="px-3 py-2 text-left font-medium">{data.interlaceName}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={`${r.capability}-${idx}`} className={rowClass(r.verdict)}>
              <td className="px-3 py-2">
                {r.capability}
                {r.citation ? (
                  <span className="ml-1 text-xs text-fd-muted-foreground">
                    ({r.citation})
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-2">{r.community}</td>
              <td className="px-3 py-2">{r.interlace}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComparisonPending({ slug }: { slug?: string }) {
  return (
    <div className="my-4 rounded-lg border border-dashed border-fd-border bg-fd-card/50 px-4 py-3 text-sm text-fd-muted-foreground">
      <strong>Comparison data pending.</strong> The structured comparison JSON for{' '}
      {slug ? <code className="font-mono">{slug}</code> : 'this plugin'} hasn't been
      committed yet. The narrative comparison above (or in the migration page) is the
      source of truth until then.
    </div>
  );
}

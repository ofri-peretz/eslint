'use client';

import * as React from 'react';
import { cn } from '../lib/cn.js';

/**
 * TimelineMap — dated entities as linked dots on a shared time axis, one
 * labeled strip per category lane.
 *
 * ## RFC (R3)
 *
 * Generalized from the blog's corpus map (100/100 Lighthouse accessibility
 * + agentic on the live site), born complete with the two rungs the app
 * version lacked: roving-tabindex arrow traversal and a controlled
 * category filter. Travel signal (R2): HIGH — proven on the blog's article
 * corpus; the docs site can map releases/changelog; anything with dated,
 * linkable entities fits.
 *
 * ### Anatomy (R11 — compound, one memoized context R15)
 *
 *   <TimelineMap items={…} data-testid="…">
 *     <TimelineMap.Filter />          — optional category chips (aria-pressed)
 *     <TimelineMap.Chart />           — axis header + lanes + dots
 *     <TimelineMap.Detail />          — fixed-height preview strip (CLS=0, R23)
 *   </TimelineMap>
 *
 * ### Keyboard (R26)
 *
 * | Key            | Action                                              |
 * | -------------- | --------------------------------------------------- |
 * | Tab            | One stop: the current dot (roving tabindex)         |
 * | → / ←          | Next / previous dot in chronological order          |
 * | Home / End     | First / last visible dot                            |
 * | Enter          | Activate the dot's link (native anchor)             |
 *
 * The app version made every dot a tab stop (89 stops on the blog corpus —
 * hostile). Roving tabindex per APG: one stop, arrows traverse.
 *
 * ### API parity (R17)
 *
 * - `onItemClick(item)` mirrors MUI DataGrid's `onRowClick`: the anchor is
 *   an internal part, so the DS surfaces its activation; navigation itself
 *   stays native.
 * - `filter` + `defaultFilter` + `onFilterChange` follow the MUI/shadcn
 *   controlled+uncontrolled convention (R14). URL-state wiring is the
 *   consumer's job — the DS never touches routers.
 * - `linkComponent` (R10 `xxxComponent`) injects a framework Link; default
 *   is a plain anchor.
 *
 * ### Encoding contract
 *
 * x = date (left → right), row = category, dot diameter = optional
 * `weight` (0..1 → 10–16px; the Detail strip must spell the value out —
 * size is never the only carrier). Marks are single-hue `chart-1` (R19
 * token): identity is carried spatially by labeled lanes, so no
 * multi-hue palette is needed and none is offered.
 *
 * Same-(lane, day) groups fan into a center-first 3-row beeswarm (a solo
 * dot sits centered; burst rows cap radius for lane-border clearance) —
 * without the fan, 43 of the blog's 89 dots were perfectly stacked.
 *
 * Static markup is SSR-honest: every item renders as a real anchor with
 * its accessible name; no floating tooltip (the Detail strip reserves its
 * height). Initial scroll rests at the recent end (state, not motion —
 * reduced-motion safe).
 */

export interface TimelineMapItem {
  /** Stable identity — used for roving focus and React keys. */
  id: string;
  /** Destination when the dot is activated. */
  href: string;
  /** Accessible/visible name of the entity. */
  label: string;
  /**
   * Lane the item belongs to. `null`/`undefined` items share the
   * `uncategorizedLabel` lane.
   */
  category?: string | null;
  /** ISO `yyyy-mm-dd`. Items without a parseable date are not rendered. */
  date: string;
  /**
   * Optional normalized magnitude (0..1) encoded as dot diameter
   * (10–16px). The Detail strip should restate it — size is never the
   * only carrier.
   * @default 0
   */
  weight?: number;
}

export interface TimelineMapProps
  extends Omit<React.ComponentPropsWithoutRef<'figure'>, 'onClick'> {
  items: readonly TimelineMapItem[];
  /** Stable selector for E2E tests; consumer provides — no default (R5). */
  'data-testid': string;
  /**
   * Lane label for items without a category.
   * @default "Other"
   */
  uncategorizedLabel?: string;
  /** Controlled set of visible categories (R14). Omit for uncontrolled. */
  filter?: readonly string[];
  /** Uncontrolled initial visible categories. @default all categories */
  defaultFilter?: readonly string[];
  /** Fires with the next visible-category set when a chip is toggled. */
  onFilterChange?: (categories: string[]) => void;
  /** Fires when a dot gains hover/focus (drives the Detail strip too). */
  onItemPreview?: (item: TimelineMapItem) => void;
  /** Fires on dot activation, alongside native navigation. */
  onItemClick?: (item: TimelineMapItem) => void;
  /** Framework link injected for dot anchors (R10). @default "a" */
  linkComponent?: React.ElementType;
  children: React.ReactNode;
}

const STRIP_W = 560; // rendered 1:1 — viewBox units ARE pixels
const LANE_H = 44;
const DOT_ROWS = [0, -13, 13] as const; // center-first beeswarm fan

interface Dot {
  item: TimelineMapItem;
  cx: number;
  cy: number;
  r: number;
}

interface Layout {
  lanes: { name: string; count: number; dots: Dot[] }[];
  ticks: { x: number; label: string }[];
  /** All visible dots in chronological order — the traversal order. */
  order: TimelineMapItem[];
}

/**
 * Pure layout: lanes (by descending count, uncategorized last), quarter
 * ticks with labeled-endpoint fallback, center-first beeswarm fan.
 * Exported for tests — geometry invariants are locked without a DOM.
 */
export function computeTimelineLayout(
  items: readonly TimelineMapItem[],
  uncategorizedLabel: string,
): Layout {
  const dated = items
    .filter((i) => /^\d{4}-\d{2}-\d{2}/.test(i.date))
    .map((i) => ({ item: i, t: Date.parse(`${i.date.slice(0, 10)}T00:00:00Z`) }))
    .filter((e) => Number.isFinite(e.t))
    .sort((a, b) => a.t - b.t || a.item.id.localeCompare(b.item.id));
  if (dated.length === 0) return { lanes: [], ticks: [], order: [] };

  const min = dated[0].t;
  const max = dated[dated.length - 1].t;
  const span = Math.max(max - min, 1);
  const x = (t: number): number => 14 + ((t - min) / span) * (STRIP_W - 46);

  const laneNames = new Map<string, number>();
  for (const { item } of dated) {
    const key = item.category ?? uncategorizedLabel;
    laneNames.set(key, (laneNames.get(key) ?? 0) + 1);
  }
  const ordered = [...laneNames.entries()]
    .sort((a, b) =>
      a[0] === uncategorizedLabel
        ? 1
        : b[0] === uncategorizedLabel
          ? -1
          : b[1] - a[1],
    )
    .map(([name, count]) => ({ name, count, dots: [] as Dot[] }));
  const byName = new Map(ordered.map((l) => [l.name, l]));

  const bursts = new Map<string, number>();
  for (const { item, t } of dated) {
    const laneName = item.category ?? uncategorizedLabel;
    const key = `${laneName}|${item.date.slice(0, 10)}`;
    const n = bursts.get(key) ?? 0;
    bursts.set(key, n + 1);
    const dy = DOT_ROWS[n % 3];
    const rBase = 5 + Math.min(Math.max(item.weight ?? 0, 0), 1) * 3;
    byName.get(laneName)?.dots.push({
      item,
      cx: x(t) + Math.floor(n / 3) * 10,
      cy: LANE_H / 2 + dy,
      r: dy === 0 ? rBase : Math.min(rBase, 6),
    });
  }

  // Quarter-start ticks; a span too narrow for one falls back to labeled
  // endpoints so the axis is never empty.
  const ticks: Layout['ticks'] = [];
  const start = new Date(min);
  let year = start.getUTCFullYear();
  let quarter = (Math.ceil((start.getUTCMonth() + 1) / 3) * 3) % 12;
  for (let guard = 0; guard < 40; guard++) {
    if (quarter === 0) year += 1;
    const t = Date.UTC(year, quarter, 1);
    if (t > max) break;
    if (t >= min) {
      ticks.push({
        x: x(t),
        label:
          quarter === 0
            ? String(year)
            : new Date(t).toLocaleDateString('en-US', {
                month: 'short',
                timeZone: 'UTC',
              }),
      });
    }
    quarter = (quarter + 3) % 12;
  }
  const fmtEndpoint = (t: number): string =>
    new Date(t).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  if (ticks.length === 0) {
    ticks.push(
      { x: x(min), label: fmtEndpoint(min) },
      { x: x(max), label: fmtEndpoint(max) },
    );
  }

  return { lanes: ordered, ticks, order: dated.map((d) => d.item) };
}

interface TimelineMapContextValue {
  layout: Layout;
  visible: (item: TimelineMapItem) => boolean;
  categories: { name: string; count: number }[];
  activeFilter: readonly string[];
  toggleCategory: (name: string) => void;
  previewed: TimelineMapItem | null;
  preview: (item: TimelineMapItem) => void;
  focusedId: string | null;
  moveFocus: (from: string, delta: 'next' | 'prev' | 'first' | 'last') => void;
  onItemClick?: (item: TimelineMapItem) => void;
  LinkComponent: React.ElementType;
  testId: string;
}

// One context for the whole pattern (R15) — value memoized below.
const TimelineMapContext =
  React.createContext<TimelineMapContextValue | null>(null);

function useTimelineMap(part: string): TimelineMapContextValue {
  const ctx = React.useContext(TimelineMapContext);
  if (!ctx) {
    throw new Error(`TimelineMap.${part} must be used inside <TimelineMap>`);
  }
  return ctx;
}

export function TimelineMap({
  items,
  'data-testid': testId,
  uncategorizedLabel = 'Other',
  filter,
  defaultFilter,
  onFilterChange,
  onItemPreview,
  onItemClick,
  linkComponent = 'a',
  className,
  children,
  ...rest
}: TimelineMapProps) {
  const layout = React.useMemo(
    () => computeTimelineLayout(items, uncategorizedLabel),
    [items, uncategorizedLabel],
  );
  const categories = React.useMemo(
    () => layout.lanes.map(({ name, count }) => ({ name, count })),
    [layout],
  );

  // Controlled + uncontrolled filter (R14).
  const [internalFilter, setInternalFilter] = React.useState<
    readonly string[] | null
  >(defaultFilter ?? null);
  const activeFilter =
    filter ?? internalFilter ?? categories.map((c) => c.name);

  const [previewed, setPreviewed] = React.useState<TimelineMapItem | null>(
    null,
  );
  const [focusedId, setFocusedId] = React.useState<string | null>(null);

  const value = React.useMemo<TimelineMapContextValue>(() => {
    const visibleSet = new Set(activeFilter);
    const visible = (item: TimelineMapItem): boolean =>
      visibleSet.has(item.category ?? uncategorizedLabel);
    const visibleOrder = layout.order.filter(visible);
    return {
      layout,
      visible,
      categories,
      activeFilter,
      toggleCategory: (name) => {
        const next = visibleSet.has(name)
          ? activeFilter.filter((c) => c !== name)
          : [...activeFilter, name];
        if (filter === undefined) setInternalFilter(next);
        onFilterChange?.(next);
      },
      previewed,
      preview: (item) => {
        setPreviewed(item);
        onItemPreview?.(item);
      },
      focusedId: focusedId ?? visibleOrder[visibleOrder.length - 1]?.id ?? null,
      moveFocus: (from, delta) => {
        if (visibleOrder.length === 0) return;
        const at = visibleOrder.findIndex((i) => i.id === from);
        const next =
          delta === 'first'
            ? 0
            : delta === 'last'
              ? visibleOrder.length - 1
              : Math.min(
                  Math.max(at + (delta === 'next' ? 1 : -1), 0),
                  visibleOrder.length - 1,
                );
        setFocusedId(visibleOrder[next].id);
      },
      onItemClick,
      LinkComponent: linkComponent,
      testId,
    };
  }, [
    layout,
    categories,
    activeFilter,
    uncategorizedLabel,
    filter,
    onFilterChange,
    previewed,
    onItemPreview,
    focusedId,
    onItemClick,
    linkComponent,
    testId,
  ]);

  return (
    <TimelineMapContext.Provider value={value}>
      <figure
        data-slot="timeline-map"
        data-testid={testId}
        className={cn(
          'rounded-lg border border-border bg-card p-4',
          className,
        )}
        {...rest}
      >
        {children}
      </figure>
    </TimelineMapContext.Provider>
  );
}

/** Optional category chips — toggle buttons, `aria-pressed`, count badges. */
export interface TimelineMapFilterProps
  extends React.ComponentPropsWithoutRef<'div'> {}

function TimelineMapFilter({ className, ...rest }: TimelineMapFilterProps) {
  const { categories, activeFilter, toggleCategory, testId } =
    useTimelineMap('Filter');
  const active = new Set(activeFilter);
  return (
    <div
      data-slot="timeline-map-filter"
      data-testid={`${testId}-filter`}
      role="group"
      aria-label="Filter by category"
      className={cn('mb-3 flex flex-wrap gap-1.5', className)}
      {...rest}
    >
      {categories.map(({ name, count }) => (
        <button
          key={name}
          type="button"
          aria-pressed={active.has(name)}
          onClick={() => toggleCategory(name)}
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
            active.has(name)
              ? 'border-chart-1/50 bg-chart-1/10 text-foreground'
              : 'border-border text-muted-foreground hover:text-foreground',
          )}
        >
          {name}
          <span className="ml-1 text-muted-foreground">{count}</span>
        </button>
      ))}
    </div>
  );
}

/** The chart: sticky lane labels, shared time axis, dot strips. */
export interface TimelineMapChartProps
  extends React.ComponentPropsWithoutRef<'div'> {}

function TimelineMapChart({ className, ...rest }: TimelineMapChartProps) {
  const {
    layout,
    visible,
    preview,
    focusedId,
    moveFocus,
    onItemClick,
    LinkComponent,
    testId,
  } = useTimelineMap('Chart');
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);

  // Rest at the recent end: the left edge of a timeline is its sparsest
  // region. Initial state, not motion — reduced-motion safe.
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const onKeyDown = (item: TimelineMapItem) => (e: React.KeyboardEvent) => {
    const delta =
      e.key === 'ArrowRight'
        ? 'next'
        : e.key === 'ArrowLeft'
          ? 'prev'
          : e.key === 'Home'
            ? 'first'
            : e.key === 'End'
              ? 'last'
              : null;
    if (!delta) return;
    e.preventDefault();
    moveFocus(item.id, delta);
  };

  // Move real focus when roving target changes via keyboard.
  const focusRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (focusedId && focusRef.current !== null && focusRef.current !== focusedId) {
      const el = scrollerRef.current?.querySelector<HTMLElement>(
        `[data-item-id="${CSS.escape(focusedId)}"]`,
      );
      el?.focus();
    }
    focusRef.current = focusedId;
  }, [focusedId]);

  return (
    <div
      ref={scrollerRef}
      data-slot="timeline-map-chart"
      data-testid={`${testId}-chart`}
      className={cn('overflow-x-auto', className)}
      {...rest}
    >
      <div className="grid w-max grid-cols-[10rem_560px]">
        <div className="sticky left-0 z-10 border-b border-border bg-card" />
        <svg
          data-slot="timeline-map-axis"
          viewBox={`0 0 ${STRIP_W} 20`}
          width={STRIP_W}
          height={20}
          aria-hidden
          className="h-5 w-[560px] border-b border-border"
        >
          <g className="text-muted-foreground">
            {layout.ticks.map((t) => (
              <g key={t.x}>
                <line
                  x1={t.x}
                  x2={t.x}
                  y1={14}
                  y2={20}
                  className="stroke-border"
                />
                <text
                  x={t.x}
                  y={11}
                  textAnchor="middle"
                  className="fill-current text-[10px]"
                >
                  {t.label}
                </text>
              </g>
            ))}
          </g>
        </svg>
        {layout.lanes.map((lane, laneIdx) => (
          <React.Fragment key={lane.name}>
            <div
              className={cn(
                'sticky left-0 z-10 flex h-11 items-center justify-between gap-2 border-b border-border/60 bg-card pr-3 text-[11px] font-medium leading-tight text-foreground',
                laneIdx % 2 === 1 && 'bg-muted/40',
              )}
            >
              <span className="truncate">{lane.name}</span>
              <span className="text-muted-foreground">{lane.count}</span>
            </div>
            <svg
              viewBox={`0 0 ${STRIP_W} ${LANE_H}`}
              width={STRIP_W}
              height={LANE_H}
              role="group"
              aria-label={`${lane.name} items`}
              className={cn(
                'h-11 w-[560px] border-b border-border/60',
                laneIdx % 2 === 1 && 'bg-muted/40',
              )}
            >
              <g className="text-muted-foreground/60">
                {layout.ticks.map((t) => (
                  <line
                    key={t.x}
                    x1={t.x}
                    x2={t.x}
                    y1={0}
                    y2={LANE_H}
                    className="stroke-border"
                    strokeDasharray="2 4"
                  />
                ))}
              </g>
              <g className="text-chart-1">
                {lane.dots.filter((d) => visible(d.item)).map((d) => (
                  <LinkComponent
                    key={d.item.id}
                    href={d.item.href}
                    data-item-id={d.item.id}
                    aria-label={`${d.item.label} — ${d.item.category ?? ''} ${d.item.date}`.trim()}
                    tabIndex={focusedId === d.item.id ? 0 : -1}
                    onMouseEnter={() => preview(d.item)}
                    onFocus={() => preview(d.item)}
                    onKeyDown={onKeyDown(d.item)}
                    onClick={() => onItemClick?.(d.item)}
                    className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                  >
                    <circle
                      cx={d.cx}
                      cy={d.cy}
                      r={d.r}
                      className="fill-current stroke-card stroke-2 opacity-80 transition-opacity hover:opacity-100"
                    />
                  </LinkComponent>
                ))}
              </g>
            </svg>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/**
 * Fixed-height preview strip — the hover layer without a floating tooltip
 * (no positioning, no clipping, CLS=0). Children-as-function overrides the
 * default rendering.
 */
export interface TimelineMapDetailProps
  extends Omit<React.ComponentPropsWithoutRef<'div'>, 'children'> {
  /** Shown before any dot has been previewed. */
  idle?: React.ReactNode;
  children?: (item: TimelineMapItem) => React.ReactNode;
}

function TimelineMapDetail({
  idle,
  children,
  className,
  ...rest
}: TimelineMapDetailProps) {
  const { previewed, testId } = useTimelineMap('Detail');
  return (
    <div
      data-slot="timeline-map-detail"
      data-testid={`${testId}-detail`}
      aria-live="polite"
      className={cn(
        'mt-3 flex min-h-12 items-center rounded-md bg-muted/40 px-4 text-sm',
        className,
      )}
      {...rest}
    >
      {previewed ? (
        children ? (
          children(previewed)
        ) : (
          <span className="truncate">
            <span className="font-medium text-foreground">
              {previewed.label}
            </span>{' '}
            <span className="text-muted-foreground">
              {previewed.category ? `· ${previewed.category} ` : ''}·{' '}
              {previewed.date}
            </span>
          </span>
        )
      ) : (
        <span className="text-muted-foreground">{idle}</span>
      )}
    </div>
  );
}

TimelineMap.Filter = TimelineMapFilter;
TimelineMap.Chart = TimelineMapChart;
TimelineMap.Detail = TimelineMapDetail;

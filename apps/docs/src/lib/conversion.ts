/**
 * Conversion measurement for the docs site: outbound GitHub / npm clicks,
 * code-block copies, and scroll depth on rule pages.
 *
 * Why this exists (PostHog analysis, 2026-11-20): eslint docs logged one
 * GitHub click in 808 sessions, `install:command_click` had 12 of its 15 events
 * from one two-minute test, no event fired when a config was copied, and scroll
 * depth was only inferred from `$pageleave`. Whether the GitHub card and the
 * rule-page "Next step" block change anything is unmeasurable without these.
 *
 * Everything here is a pure function over DOM nodes and a `pathname`, so the
 * handlers are unit-tested without a browser or a real PostHog (see
 * `__tests__/conversion-events.test.ts`). The one DOM-facing mount is
 * `components/conversion-tracker.tsx`.
 *
 * Privacy, by construction:
 * - Events go through `track()` in `lib/analytics.ts`, which already returns on
 *   DNT / GPC, and `posthog.capture` is a no-op until `initPostHog()` has
 *   accepted the environment (local dev, automation and `*.vercel.app` are
 *   refused there). Nothing in this file bypasses either gate.
 * - Payloads carry a pathname (no query string, no hash), a placement label, a
 *   public destination (`ofri-peretz/eslint`, an npm package name) and a code
 *   block ordinal. No text the visitor typed, no copied content, no identifiers.
 */

export type OutboundKind = 'github' | 'npm';

export type Placement =
  | 'github-card'
  | 'next-step'
  | 'header'
  | 'sidebar'
  | 'footer'
  | 'content'
  | 'other'
  | (string & {});

export interface PageKind {
  kind: 'rule' | 'plugin' | 'guide' | 'other';
  plugin?: string;
  rule?: string;
}

/** What the pure handlers call; the component binds this to `track()`. */
export type Emit = (event: string, payload: Record<string, unknown>) => void;

const GITHUB_HOSTS = new Set(['github.com', 'www.github.com']);
const NPM_HOSTS = new Set(['npmjs.com', 'www.npmjs.com']);

/** Which outbound destination an href points at, or `null` for everything else. */
export function classifyOutbound(
  href: string | null | undefined,
  base = 'https://eslint.interlace.tools',
): OutboundKind | null {
  if (!href) return null;
  try {
    const host = new URL(href, base).hostname.toLowerCase();
    if (GITHUB_HOSTS.has(host)) return 'github';
    if (NPM_HOSTS.has(host)) return 'npm';
  } catch {
    // Not a URL: not outbound.
  }
  return null;
}

/**
 * The public part of the destination: `ofri-peretz/eslint/tree/main/...` or
 * `package/eslint-plugin-x`. Query and hash are dropped (utm params and
 * anchors carry nothing we want to store).
 */
export function destinationOf(
  href: string,
  base = 'https://eslint.interlace.tools',
): string {
  try {
    const url = new URL(href, base);
    return url.pathname.replace(/^\/+|\/+$/g, '').slice(0, 120);
  } catch {
    return '';
  }
}

/** `/docs/security/plugin-x/rules/y` -> rule page; `/docs/security/plugin-x` -> plugin page. */
export function pageKind(pathname: string): PageKind {
  const slug = pathname.split('?')[0].split('#')[0].split('/').filter(Boolean);
  if (slug[0] !== 'docs') return { kind: 'other' };
  const rest = slug.slice(1);
  const rulesIdx = rest.indexOf('rules');
  if (rulesIdx > 0 && rulesIdx < rest.length - 1) {
    return {
      kind: 'rule',
      plugin: rest[rulesIdx - 1].replace(/^plugin-/, ''),
      rule: rest[rulesIdx + 1],
    };
  }
  if (rest.length === 2 && rest[1].startsWith('plugin-')) {
    return { kind: 'plugin', plugin: rest[1].replace(/^plugin-/, '') };
  }
  if (rest[0] === 'getting-started' && rest.length === 2)
    return { kind: 'guide' };
  return { kind: 'other' };
}

/**
 * Where on the page an element sits. An explicit `data-placement` wins (the
 * GitHub card and the Next step block set one), then the layout landmark.
 */
export function placementOf(el: Element | null): Placement {
  if (!el) return 'other';
  const tagged = el.closest('[data-placement]')?.getAttribute('data-placement');
  if (tagged) return tagged;
  if (el.closest('header, nav, #nd-nav')) return 'header';
  if (el.closest('aside, #nd-sidebar')) return 'sidebar';
  if (el.closest('footer')) return 'footer';
  if (el.closest('main, article, #nd-page, #main-content')) return 'content';
  return 'other';
}

const INSTALL_LINE = /^\s*(?:npm|pnpm|yarn|bun)\s+(?:i|install|add)\b/;

/** An install command block, not a config: tagged, inside InstallSnippet, or recognisable. */
export function isInstallBlock(figure: Element): boolean {
  if (figure.getAttribute('data-copy-kind') === 'install') return true;
  if (figure.closest('[data-testid="install-snippet"]')) return true;
  const pre = figure.querySelector('pre');
  return pre ? INSTALL_LINE.test(pre.textContent ?? '') : false;
}

/** Stable-enough block identity: its ordinal on the page and its title, when it has one. */
export function describeBlock(
  figure: Element,
  root: ParentNode = figure.ownerDocument,
): { block_id: string; block_title: string } {
  const explicit = figure.getAttribute('data-block-id');
  const all = Array.from(root.querySelectorAll('figure.shiki'));
  const ordinal = Math.max(all.indexOf(figure as HTMLElement), 0) + 1;
  const title = (figure.querySelector('figcaption')?.textContent ?? '')
    .trim()
    .slice(0, 60);
  return { block_id: explicit ?? `code-${ordinal}`, block_title: title };
}

/** Copy clicks within a second on the same block are one intent, not two. */
const COPY_DEBOUNCE_MS = 1000;

export interface ClickDeps {
  emit: Emit;
  now?: () => number;
  /** Last copy time per block; defaults to a module-level map. */
  lastCopy?: WeakMap<Element, number>;
}

const defaultLastCopy = new WeakMap<Element, number>();

/**
 * Document-level click handler. Returns the event name it emitted, or null.
 * A click is classified once: a copy button wins over a link, because a copy
 * button never sits inside an anchor.
 */
export function handleConversionClick(
  target: EventTarget | null,
  pathname: string,
  { emit, now = Date.now, lastCopy = defaultLastCopy }: ClickDeps,
): string | null {
  const el = target as Element | null;
  if (!el || typeof el.closest !== 'function') return null;
  const source_page = pathname.split('?')[0].split('#')[0];
  const page = pageKind(source_page);
  const ctx: Record<string, unknown> = { source_page, page_kind: page.kind };
  if (page.plugin) ctx.plugin = page.plugin;
  if (page.rule) ctx.rule = page.rule;

  const figure = el.closest('figure.shiki');
  if (figure && el.closest('button') && !el.closest('[role="tab"]')) {
    const t = now();
    const prior = lastCopy.get(figure);
    if (prior !== undefined && t - prior < COPY_DEBOUNCE_MS) return null;
    lastCopy.set(figure, t);
    const block = describeBlock(figure);
    if (isInstallBlock(figure)) {
      emit('install_copy', {
        ...ctx,
        ...block,
        placement: placementOf(figure),
      });
      return 'install_copy';
    }
    emit('config_copy', { ...ctx, ...block, placement: placementOf(figure) });
    return 'config_copy';
  }

  const anchor = el.closest('a[href]');
  if (anchor) {
    const href = anchor.getAttribute('href');
    const kind = classifyOutbound(href);
    if (kind && href) {
      const event = kind === 'github' ? 'github_click' : 'npm_click';
      emit(event, {
        ...ctx,
        placement: placementOf(anchor),
        destination: destinationOf(href),
      });
      return event;
    }
  }
  return null;
}

export const SCROLL_THRESHOLDS = [50, 90] as const;

export interface ScrollMetrics {
  scrollTop: number;
  viewportHeight: number;
  scrollHeight: number;
}

/**
 * Fires each threshold once. Called from scroll events only, so a page that
 * fits in the viewport (nothing to scroll) emits nothing rather than a
 * meaningless 50 and 90 at load.
 */
export function createScrollDepthTracker(
  emit: (depth: number) => void,
  thresholds: readonly number[] = SCROLL_THRESHOLDS,
) {
  const fired = new Set<number>();
  return {
    update({
      scrollTop,
      viewportHeight,
      scrollHeight,
    }: ScrollMetrics): number[] {
      if (scrollHeight <= 0) return [];
      const pct = Math.min(
        100,
        ((scrollTop + viewportHeight) / scrollHeight) * 100,
      );
      const now: number[] = [];
      for (const t of thresholds) {
        if (pct >= t && !fired.has(t)) {
          fired.add(t);
          now.push(t);
          emit(t);
        }
      }
      return now;
    },
    fired: () => [...fired],
  };
}

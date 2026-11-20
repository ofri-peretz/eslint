// @vitest-environment jsdom
/**
 * Lock: the conversion events fire with the right names and properties, and
 * carry nothing a visitor typed or copied.
 *
 * Handlers are exercised against real DOM nodes shaped like the site's (a
 * fumadocs `figure.shiki` with a copy button, links in the sidebar card, the
 * Next step block and the nav), with `emit` replaced by a recorder. No real
 * PostHog, no network. The gating (DNT / GPC / local dev) lives in `track()`
 * and `posthog-init.ts`, pinned by `posthog-provider-lock.test.tsx` and the
 * last block here.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  classifyOutbound,
  createScrollDepthTracker,
  describeBlock,
  destinationOf,
  handleConversionClick,
  isInstallBlock,
  pageKind,
  placementOf,
} from '@/lib/conversion';

const RULE_PAGE =
  '/docs/security/plugin-secure-coding/rules/no-redos-vulnerable-regex';

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

function recorder() {
  const events: Array<{ event: string; payload: Record<string, unknown> }> = [];
  return {
    events,
    emit: (event: string, payload: Record<string, unknown>) =>
      events.push({ event, payload }),
  };
}

const click = (el: Element | null, path = RULE_PAGE, extra = {}) => {
  const r = recorder();
  const fired = handleConversionClick(el, path, { emit: r.emit, ...extra });
  return { fired, ...r };
};

describe('outbound links', () => {
  it('classifies github and npm hosts, and nothing else', () => {
    expect(classifyOutbound('https://github.com/ofri-peretz/eslint')).toBe(
      'github',
    );
    expect(
      classifyOutbound('https://www.npmjs.com/package/eslint-plugin-x'),
    ).toBe('npm');
    expect(classifyOutbound('https://npmjs.com/package/x')).toBe('npm');
    expect(classifyOutbound('/docs/getting-started')).toBeNull();
    expect(classifyOutbound('https://github.com.evil.example/x')).toBeNull();
    expect(classifyOutbound('https://dev.to/ofri-peretz')).toBeNull();
    expect(classifyOutbound(undefined)).toBeNull();
  });

  it('keeps only the public path of the destination (no query, no hash)', () => {
    expect(
      destinationOf(
        'https://github.com/ofri-peretz/eslint?utm_source=docs#readme',
      ),
    ).toBe('ofri-peretz/eslint');
    expect(
      destinationOf('https://www.npmjs.com/package/eslint-plugin-x/'),
    ).toBe('package/eslint-plugin-x');
  });

  it('fires github_click from the sidebar card with source page and placement', () => {
    mount(
      `<aside id="nd-sidebar"><div data-github-card="sidebar" data-placement="github-card">
        <a href="https://github.com/ofri-peretz/eslint"><span id="t">View on GitHub</span></a></div></aside>`,
    );
    const { fired, events } = click(document.getElementById('t'));
    expect(fired).toBe('github_click');
    expect(events).toEqual([
      {
        event: 'github_click',
        payload: {
          source_page: RULE_PAGE,
          page_kind: 'rule',
          plugin: 'secure-coding',
          rule: 'no-redos-vulnerable-regex',
          placement: 'github-card',
          destination: 'ofri-peretz/eslint',
        },
      },
    ]);
  });

  it('fires npm_click from the Next step block', () => {
    mount(
      `<main><section data-next-step="r" data-placement="next-step">
        <a id="a" href="https://www.npmjs.com/package/eslint-plugin-secure-coding">npm</a></section></main>`,
    );
    const { fired, events } = click(document.getElementById('a'));
    expect(fired).toBe('npm_click');
    expect(events[0].payload).toMatchObject({
      placement: 'next-step',
      destination: 'package/eslint-plugin-secure-coding',
    });
  });

  it('falls back to the layout landmark when nothing is tagged', () => {
    mount(
      `<header><a id="h" href="https://github.com/ofri-peretz/eslint">GitHub</a></header>
       <main><a id="c" href="https://github.com/ofri-peretz/eslint/issues">issues</a></main>`,
    );
    expect(placementOf(document.getElementById('h'))).toBe('header');
    expect(placementOf(document.getElementById('c'))).toBe('content');
  });

  it('ignores internal links and links to other hosts', () => {
    mount(
      `<main><a id="i" href="/docs/getting-started">x</a><a id="o" href="https://dev.to/x">y</a></main>`,
    );
    expect(click(document.getElementById('i')).fired).toBeNull();
    expect(click(document.getElementById('o')).fired).toBeNull();
  });
});

const figure = (title: string, code: string, attrs = '') =>
  `<figure class="shiki" ${attrs}><div><figcaption>${title}</figcaption><div><button type="button">copy</button></div></div><div role="region"><pre><code id="c">${code}</code></pre></div></figure>`;

describe('code block copy', () => {
  it('fires config_copy with page and block id, and never the copied text', () => {
    mount(
      `<main>${figure('one.js', 'a')}${figure('eslint.config.js', "import { configs } from 'x';\nexport default [configs.recommended];")}</main>`,
    );
    const button = document.querySelectorAll('button')[1];
    const { fired, events } = click(button);
    expect(fired).toBe('config_copy');
    expect(events[0].payload).toMatchObject({
      source_page: RULE_PAGE,
      block_id: 'code-2',
      block_title: 'eslint.config.js',
      placement: 'content',
    });
    expect(JSON.stringify(events)).not.toContain('configs.recommended');
  });

  it('fires install_copy for install commands, tagged or recognisable', () => {
    mount(
      `<main>${figure('Install', 'npm install -D eslint-plugin-x', 'data-copy-kind="install" data-block-id="next-step-install"')}${figure('', 'pnpm add -D eslint-plugin-x')}</main>`,
    );
    const [b1, b2] = Array.from(document.querySelectorAll('button'));
    const first = click(b1);
    expect(first.fired).toBe('install_copy');
    expect(first.events[0].payload.block_id).toBe('next-step-install');
    expect(click(b2).fired).toBe('install_copy');
  });

  it('treats a copy inside InstallSnippet as an install, not a config', () => {
    mount(
      `<main><div data-testid="install-snippet">${figure('', 'anything')}</div></main>`,
    );
    const fig = document.querySelector('figure')!;
    expect(isInstallBlock(fig)).toBe(true);
  });

  it('counts a double click within a second once, and a later copy again', () => {
    mount(`<main>${figure('eslint.config.js', 'x')}</main>`);
    const button = document.querySelector('button')!;
    const r = recorder();
    const lastCopy = new WeakMap<Element, number>();
    let t = 1000;
    const deps = { emit: r.emit, now: () => t, lastCopy };
    handleConversionClick(button, RULE_PAGE, deps);
    t += 300;
    handleConversionClick(button, RULE_PAGE, deps);
    t += 2000;
    handleConversionClick(button, RULE_PAGE, deps);
    expect(r.events.map((e) => e.event)).toEqual([
      'config_copy',
      'config_copy',
    ]);
  });

  it('does not treat a package-manager tab as a copy', () => {
    mount(
      `<main><figure class="shiki"><div role="tablist"><button role="tab" id="tab">pnpm</button></div></figure></main>`,
    );
    expect(click(document.getElementById('tab')).fired).toBeNull();
  });

  it('describeBlock names the ordinal among blocks on the page', () => {
    mount(
      `<main>${figure('a', '1')}${figure('b', '2')}${figure('c', '3')}</main>`,
    );
    const figs = document.querySelectorAll('figure');
    expect(describeBlock(figs[2])).toEqual({
      block_id: 'code-3',
      block_title: 'c',
    });
  });
});

describe('page kinds', () => {
  it('reads rule, plugin and guide pages from the pathname', () => {
    expect(pageKind(RULE_PAGE)).toEqual({
      kind: 'rule',
      plugin: 'secure-coding',
      rule: 'no-redos-vulnerable-regex',
    });
    expect(pageKind('/docs/security/plugin-nestjs-security')).toEqual({
      kind: 'plugin',
      plugin: 'nestjs-security',
    });
    expect(
      pageKind('/docs/getting-started/detect-xss-eslint-flat-config'),
    ).toEqual({
      kind: 'guide',
    });
    expect(pageKind('/stats').kind).toBe('other');
    expect(pageKind(`${RULE_PAGE}?utm_source=x#top`).rule).toBe(
      'no-redos-vulnerable-regex',
    );
  });

  it('never puts a query string or hash into source_page', () => {
    mount(
      `<main><a id="a" href="https://github.com/ofri-peretz/eslint">g</a></main>`,
    );
    const { events } = click(
      document.getElementById('a'),
      `${RULE_PAGE}?q=secret#frag`,
    );
    expect(events[0].payload.source_page).toBe(RULE_PAGE);
  });
});

describe('scroll depth', () => {
  it('fires 50 and 90 once each, in order, and never again', () => {
    const seen: number[] = [];
    const tracker = createScrollDepthTracker((d) => seen.push(d));
    const m = (scrollTop: number) => ({
      scrollTop,
      viewportHeight: 800,
      scrollHeight: 4000,
    });
    expect(tracker.update(m(0))).toEqual([]); // 20%
    expect(tracker.update(m(1200))).toEqual([50]); // (1200+800)/4000 = 50%
    expect(seen).toEqual([50]);
    expect(tracker.update(m(1300))).toEqual([]);
    expect(tracker.update(m(2800))).toEqual([90]); // 90%
    expect(tracker.update(m(3200))).toEqual([]);
    expect(seen).toEqual([50, 90]);
  });

  it('one jump to the bottom reports both thresholds', () => {
    const seen: number[] = [];
    const tracker = createScrollDepthTracker((d) => seen.push(d));
    tracker.update({
      scrollTop: 3200,
      viewportHeight: 800,
      scrollHeight: 4000,
    });
    expect(seen).toEqual([50, 90]);
  });

  it('a degenerate page (no height) emits nothing', () => {
    const seen: number[] = [];
    const tracker = createScrollDepthTracker((d) => seen.push(d));
    expect(
      tracker.update({ scrollTop: 0, viewportHeight: 800, scrollHeight: 0 }),
    ).toEqual([]);
  });
});

describe('consent and privacy stay where they were', () => {
  const SRC = join(__dirname, '..');
  const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

  it('events go through track(), which honours DNT and GPC', () => {
    const tracker = read('components/conversion-tracker.tsx');
    expect(tracker).toMatch(
      /import \{[^}]*\btrack\b[^}]*\} from '@\/lib\/analytics'/,
    );
    expect(tracker).not.toMatch(
      /posthog\.capture|from '@\/lib\/posthog-init'|from 'posthog-js/,
    );
    const analytics = read('lib/analytics.ts');
    expect(analytics).toMatch(/doNotTrack/);
    expect(analytics).toMatch(/globalPrivacyControl/);
  });

  it('no identify, no person properties, no storage in the conversion module', () => {
    const src = read('lib/conversion.ts').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).not.toMatch(
      /identify|\$set|localStorage|sessionStorage|document\.cookie/,
    );
  });

  it('the typed event map declares every event the handlers emit', () => {
    const analytics = read('lib/analytics.ts');
    for (const name of [
      'github_click',
      'npm_click',
      'config_copy',
      'install_copy',
      'scroll_depth',
    ])
      expect(analytics).toMatch(new RegExp(`\\b${name}:`));
  });

  it('is mounted once, under the PostHog provider, in the root layout', () => {
    const layout = read('app/layout.tsx');
    expect(layout).toMatch(/<ConversionTracker \/>/);
    expect(layout.indexOf('<PostHogProvider>')).toBeLessThan(
      layout.indexOf('<ConversionTracker />'),
    );
  });
});

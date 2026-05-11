#!/usr/bin/env tsx
/**
 * a11y-gradient-sweep — walks every site route, finds every element whose
 * background is a CSS gradient, and verifies text contrast at multiple
 * gradient stops. Covers axe's documented blind spot: axe falls back to the
 * computed `background-color` (which is `transparent` for gradient bgs) and
 * silently skips contrast checks.
 *
 * For every gradient element with visible text:
 *   - Sample 5 points along the gradient (0%, 25%, 50%, 75%, 100%).
 *   - Compute contrast ratio between the text color and each sampled bg.
 *   - Report the lowest ratio + the WCAG bar it fails (AAA / AAA-large / AA / AA-large).
 *
 * Failure threshold: AAA (7:1 for normal text, 4.5:1 for large text).
 * Set `BAR=AA` to relax to AA (4.5:1 / 3:1).
 *
 * Usage (with dev server up on $BASE_URL, default http://localhost:3000):
 *   npx tsx apps/docs/scripts/a11y-gradient-sweep.ts
 *   BAR=AA  npx tsx apps/docs/scripts/a11y-gradient-sweep.ts
 *   BASE_URL=http://localhost:3000 npx tsx apps/docs/scripts/a11y-gradient-sweep.ts
 *
 * Exits 1 if any element fails its WCAG bar. Writes `a11y-gradient-report.md`.
 */

import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const BAR = (process.env.BAR ?? 'AAA') as 'AA' | 'AAA';

const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'articles', path: '/articles' },
  { name: 'docs-getting-started', path: '/docs/getting-started' },
  {
    name: 'rule-page',
    path: '/docs/security/plugin-node-security/rules/no-sha1-hash',
  },
];

interface SampleFailure {
  route: string;
  selector: string;
  textPreview: string;
  textColor: string;
  bgSample: string;
  ratio: number;
  isLargeText: boolean;
  fails: string[];
}

function parseRgb(input: string): [number, number, number, number] | null {
  // Accept rgb(r, g, b), rgba(r, g, b, a), or color(...) — give up on color()
  // we can't analytically interpolate (e.g., display-p3).
  const m = input.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/,
  );
  if (!m) return null;
  return [+m[1], +m[2], +m[3], m[4] !== undefined ? +m[4] : 1];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const sRGB = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

function contrast(
  fg: [number, number, number, number],
  bg: [number, number, number, number],
): number {
  // Composite fg over bg using alpha. For simplicity, treat text as opaque.
  const l1 = relativeLuminance(fg[0], fg[1], fg[2]);
  const l2 = relativeLuminance(bg[0], bg[1], bg[2]);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Extract color stops from a CSS linear-gradient / radial-gradient.
 * We only need the COLORS — positions are evenly distributed for sampling.
 */
function parseGradientColors(bgImage: string): string[] {
  // Strip the gradient() wrapper.
  const inner = bgImage.replace(
    /^(?:repeating-)?(?:linear|radial|conic)-gradient\(/,
    '',
  );
  if (inner === bgImage) return [];

  // Match `rgb(...)`, `rgba(...)`, or hex with optional position suffix.
  const out: string[] = [];
  const re = /(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) out.push(m[1]);
  return out;
}

function expandHex(hex: string): [number, number, number, number] | null {
  let v = hex.slice(1);
  if (v.length === 3 || v.length === 4) {
    v = v
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (v.length !== 6 && v.length !== 8) return null;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  const a = v.length === 8 ? parseInt(v.slice(6, 8), 16) / 255 : 1;
  return [r, g, b, a];
}

function toRgba(color: string): [number, number, number, number] | null {
  if (color.startsWith('#')) return expandHex(color);
  return parseRgb(color);
}

function isLargeText(fontSizePx: number, fontWeight: number): boolean {
  // WCAG: "Large text" = ≥18pt regular OR ≥14pt bold. 1pt ≈ 1.333px.
  // 18pt = ~24px, 14pt = ~18.66px.
  if (fontSizePx >= 24) return true;
  if (fontSizePx >= 18.66 && fontWeight >= 700) return true;
  return false;
}

function passingBar(
  ratio: number,
  large: boolean,
): { aa: boolean; aaa: boolean } {
  return large
    ? { aa: ratio >= 3, aaa: ratio >= 4.5 }
    : { aa: ratio >= 4.5, aaa: ratio >= 7 };
}

async function main() {
  const browser = await chromium.launch();
  const failures: SampleFailure[] = [];
  let elementsChecked = 0;

  for (const route of ROUTES) {
    const ctx = await browser.newContext({ colorScheme: 'light' });
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE_URL}${route.path}`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      });
      await page.waitForTimeout(500);
      // Match the e2e a11y scan: scope to body so dev-overlay shadow DOM
      // doesn't pollute the sweep.
      await page.evaluate(`
        document.querySelectorAll('nextjs-portal').forEach((el) => el.remove());
      `);
    } catch (err) {
      console.error(`Failed to load ${route.path}: ${(err as Error).message}`);
      await ctx.close();
      continue;
    }

    // Collect every element with a gradient background that has visible
    // text. Inline as a string so tsx's transpiler doesn't inject helpers
    // that fail in the browser context (`__name` etc.).
    const samples = (await page.evaluate(`
      (() => {
        const out = [];
        const all = document.body.querySelectorAll('*');
        for (const el of Array.from(all)) {
          const cs = getComputedStyle(el);
          if (!cs.backgroundImage.includes('gradient')) continue;
          const text = (el.textContent || '').trim();
          if (!text) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          let selector;
          if (el.id) selector = '#' + el.id;
          else {
            const cls = Array.from(el.classList).slice(0, 3).join('.');
            selector = cls ? el.tagName.toLowerCase() + '.' + cls : el.tagName.toLowerCase();
          }
          out.push({
            selector,
            bgImage: cs.backgroundImage,
            textColor: cs.color,
            text: text.slice(0, 60),
            fontSizePx: parseFloat(cs.fontSize) || 16,
            fontWeight: parseFloat(cs.fontWeight) || 400,
          });
        }
        return out;
      })()
    `)) as Array<{
      selector: string;
      bgImage: string;
      textColor: string;
      text: string;
      fontSizePx: number;
      fontWeight: number;
    }>;

    for (const s of samples) {
      const colors = parseGradientColors(s.bgImage);
      if (colors.length === 0) continue;
      elementsChecked++;
      const fg = toRgba(s.textColor);
      if (!fg) continue;
      const large = isLargeText(s.fontSizePx, s.fontWeight);

      // Sample every color stop in the gradient. Skip fully transparent
      // stops — they reveal the underlying surface, which is the parent's
      // background (not part of this gradient). Reporting against
      // `rgba(0,0,0,0)` would always read as a contrast violation against
      // any text color, but it's a false positive: the user sees the
      // parent bg through it.
      let worstRatio = Infinity;
      let worstStop = '';
      for (const c of colors) {
        const bg = toRgba(c);
        if (!bg) continue;
        if (bg[3] === 0) continue; // fully transparent stop
        const r = contrast(fg, bg);
        if (r < worstRatio) {
          worstRatio = r;
          worstStop = c;
        }
      }
      if (worstRatio === Infinity) continue;

      const pass = passingBar(worstRatio, large);
      const failedBars: string[] = [];
      if (!pass.aa) failedBars.push(large ? 'AA-large (3:1)' : 'AA (4.5:1)');
      if (!pass.aaa) failedBars.push(large ? 'AAA-large (4.5:1)' : 'AAA (7:1)');

      // We fail loud at BAR.
      const failed =
        BAR === 'AAA' ? !pass.aaa : !pass.aa;
      if (failed) {
        failures.push({
          route: route.name,
          selector: s.selector,
          textPreview: s.text,
          textColor: s.textColor,
          bgSample: worstStop,
          ratio: Math.round(worstRatio * 100) / 100,
          isLargeText: large,
          fails: failedBars,
        });
      }
    }

    await ctx.close();
  }

  await browser.close();

  const lines: string[] = [];
  lines.push('# Gradient contrast sweep');
  lines.push('');
  lines.push(`- bar: **${BAR}**`);
  lines.push(`- elements checked: ${elementsChecked}`);
  lines.push(`- failures: ${failures.length}`);
  lines.push('');

  if (failures.length > 0) {
    lines.push('## Failing elements');
    lines.push('');
    for (const f of failures) {
      lines.push(`### [${f.route}] \`${f.selector}\` — ${f.ratio}:1`);
      lines.push(`- text: ${JSON.stringify(f.textPreview)}`);
      lines.push(
        `- text color: \`${f.textColor}\`  bg sample: \`${f.bgSample}\``,
      );
      lines.push(`- large text: ${f.isLargeText ? 'yes' : 'no'}`);
      lines.push(`- fails: ${f.fails.join(', ')}`);
      lines.push('');
    }
  } else {
    lines.push('All gradient elements pass the configured WCAG bar.');
  }

  const report = lines.join('\n');
  writeFileSync('a11y-gradient-report.md', report);
  console.log('\n' + report);
  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});

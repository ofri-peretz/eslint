/**
 * Remote-image offline lock
 *
 * Regression lock for PR #286: the `Build (Turbo)` check went red because a
 * transient shields.io 502 broke prerender of
 * `/docs/security/plugin-nestjs-security`:
 *
 *   [Remark Image] Failed obtain image size for
 *   https://img.shields.io/npm/dt/@nestjs/core.svg (502)
 *
 * fumadocs' `remarkImage` fetches every external image at build time to read
 * its intrinsic size. The plugin READMEs we render via `<RemoteReadme>` carry
 * ~275 shields.io badges, so *any* shields.io hiccup took the whole build down.
 *
 * The lock: compiling remote content must never touch the network for images.
 * These tests fail on the unfixed code (fetch rejects → compile throws).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@testing-library/react';
import { getMDXComponents } from '@/mdx-components';

const DOCS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const BADGE_MARKDOWN = `# Compatibility

| Package | Downloads |
| --- | --- |
| \`@nestjs/core\` | [![downloads](https://img.shields.io/npm/dt/@nestjs/core.svg?style=flat-square)](https://www.npmjs.com/package/@nestjs/core) |
`;

/** Stand in for "shields.io is down" / "CI has no network". */
function blockNetwork() {
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValue(new Error('network blocked by remote-image-offline-lock'));
  return fetchSpy;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('remote MDX compilation is network-free for images', () => {
  it('compiles README badges with the network blocked', async () => {
    const fetchSpy = blockNetwork();
    const { compileRemoteMDX } = await import('@/lib/mdx-compiler');

    const result = await compileRemoteMDX(BADGE_MARKDOWN, {
      pluginName: 'nestjs-security',
    });

    expect(result.Body).toBeTypeOf('function');
    expect(fetchSpy).not.toHaveBeenCalled();
  }, 30000);

  it('compiles plain remote Markdown with the network blocked', async () => {
    const fetchSpy = blockNetwork();
    const { compileRemoteMarkdown } = await import('@/lib/mdx-compiler');

    const result = await compileRemoteMarkdown(BADGE_MARKDOWN);

    expect(result.Body).toBeTypeOf('function');
    expect(fetchSpy).not.toHaveBeenCalled();
  }, 30000);

  it('disables external image sizing in the static MDX pipeline too', () => {
    const source = readFileSync(resolve(DOCS_ROOT, 'source.config.ts'), 'utf-8');
    expect(source).toMatch(/remarkImageOptions:\s*{[^}]*external:\s*false/);
  });

  it('disables external image sizing in the remote MDX pipeline', () => {
    const source = readFileSync(
      resolve(DOCS_ROOT, 'src/lib/mdx-compiler.tsx'),
      'utf-8'
    );
    expect(source).toMatch(
      /REMARK_IMAGE_OPTIONS\s*=\s*{\s*external:\s*false\s*}/
    );
    // Both compileRemoteMDX and compileRemoteMarkdown build their own compiler,
    // so both have to opt out — a new compiler must not silently re-enable it.
    const passes = source.match(
      /remarkImageOptions:\s*REMARK_IMAGE_OPTIONS/g
    );
    const compilers = source.match(/=\s*createCompiler\(/g);
    expect(passes).toHaveLength(compilers?.length ?? 0);
  });
});

describe('the README that broke PR #286 prerenders offline', () => {
  it('compiles and renders eslint-plugin-nestjs-security with shields.io down', async () => {
    const fetchSpy = blockNetwork();
    const { compileRemoteMDX } = await import('@/lib/mdx-compiler');
    // The compiled body contains async server components (Shiki highlights
    // code blocks), so it needs the streaming prerenderer, not the sync one.
    const { prerender } = await import('react-dom/static');

    // The same bytes `<RemoteReadme plugin="nestjs-security">` pulls from
    // raw.githubusercontent.com — 20+ shields.io badges in Compatibility and
    // Related Plugins tables. HTML comments are stripped by the compiler.
    const readme = readFileSync(
      resolve(DOCS_ROOT, '../../packages/eslint-plugin-nestjs-security/README.md'),
      'utf-8'
    );

    const { Body } = await compileRemoteMDX(readme, {
      pluginName: 'nestjs-security',
    });
    const { prelude } = await prerender(<Body />);
    const html = await new Response(prelude).text();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(html).toContain('img.shields.io');
    // Badges still reserve their box, so no build-time measurement is needed.
    expect(html).toMatch(/<img[^>]+img\.shields\.io[^>]+height="20"/);
  }, 60000);
});

describe('unsized images degrade instead of crashing the render', () => {
  const Img = () =>
    getMDXComponents().img as React.ComponentType<
      React.ImgHTMLAttributes<HTMLImageElement>
    >;

  // next/image throws on a string src with no width/height — without this
  // fallback, turning off external sizing would trade a build failure for a
  // render failure.
  it('renders an unsized README badge without throwing', () => {
    const Component = Img();
    const { container } = render(
      <Component
        src="https://img.shields.io/npm/dt/@nestjs/core.svg?style=flat-square"
        alt="downloads"
      />
    );

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain('img.shields.io');
    expect(img?.getAttribute('loading')).toBe('lazy');
  });

  it('reserves the 20px badge box so the CLS budget holds', () => {
    const Component = Img();
    const { container } = render(
      <Component src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="license" />
    );

    const img = container.querySelector('img');
    expect(img?.getAttribute('height')).toBe('20');
    expect(Number(img?.getAttribute('width'))).toBeGreaterThan(0);
    // The real intrinsic width takes over once the badge decodes.
    expect(img?.className).toContain('h-5');
    expect(img?.className).toContain('w-auto');
  });

  it('reserves a box for unsized non-badge images too', () => {
    const Component = Img();
    const { container } = render(
      <Component
        src="https://upload.wikimedia.org/wikipedia/commons/f/f0/Tux_ecb.jpg"
        alt="ECB penguin"
      />
    );

    const img = container.querySelector('img');
    // Non-zero on BOTH axes or the browser has no aspect ratio to reserve —
    // `width="0" height="0"` is the next/image idiom and reserves nothing on a
    // plain image element. Caught in review on PR #308.
    expect(Number(img?.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(img?.getAttribute('height'))).toBeGreaterThan(0);
    expect(img?.className).toContain('h-auto');
    // `sizes` only does something alongside `srcset`, which we never emit.
    expect(img?.getAttribute('sizes')).toBeNull();
  });

  it('keeps the real dimensions when remark did supply them', () => {
    const Component = Img();
    const { container } = render(
      <Component src="/logo.png" alt="logo" width={64} height={32} />
    );

    const img = container.querySelector('img');
    expect(img?.getAttribute('width')).toBe('64');
    expect(img?.getAttribute('height')).toBe('32');
  });
});

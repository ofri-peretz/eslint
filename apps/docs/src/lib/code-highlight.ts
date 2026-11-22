/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * One Shiki configuration for every code block the docs site renders: local
 * MDX (`source.config.ts`), README / CHANGELOG markdown fetched at build time
 * (`lib/mdx-compiler.tsx`), and client-rendered snippets
 * (`components/docs/code-block.tsx`). Three highlighters with three theme
 * settings is how a page shipped `github-light` comment grey at 4.26:1.
 *
 * The GitHub light themes are not AA on our code-block backgrounds. A block
 * inside tabs sits on `bg-fd-secondary`, measured by Lighthouse at #f1f1f1;
 * there `github-light-default`'s comment grey #6e7781 is 4.03:1 and its purple
 * #8250df is 4.47:1, under the 4.5:1 WCAG floor. Each is mapped to a darker
 * step (the comment grey to 7:1, see below). Dark mode is untouched.
 *
 * Locked by `src/__tests__/code-highlight-contrast-lock.test.ts`.
 */
export const CODE_THEMES = {
  light: 'github-light-default',
  dark: 'github-dark-default',
} as const;

/** Keys are lowercase: Shiki lowercases a token colour before the lookup. */
export const CODE_COLOR_REPLACEMENTS: Record<string, Record<string, string>> = {
  'github-light-default': {
    // Comments and purple clear 7:1 (#454d56 is 7.59 on #f1f1f1): the strict axe scan gates the
    // ACT tag, which carries color-contrast-enhanced, and a comment is the one token
    // a page can open a code block with.
    '#6e7781': '#454d56',
    '#8250df': '#5a32a3', // 7.68:1 on #f1f1f1 (#6639ba was 6.5, flagged on rule pages)
  },
};

export const CODE_HIGHLIGHT_OPTIONS = {
  themes: CODE_THEMES,
  colorReplacements: CODE_COLOR_REPLACEMENTS,
};

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
 * #8250df is 4.47:1, under the 4.5:1 WCAG floor. Each is mapped to the next
 * darker Primer step. Dark mode is untouched.
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
    '#6e7781': '#59636e',
    '#8250df': '#6639ba',
  },
};

export const CODE_HIGHLIGHT_OPTIONS = {
  themes: CODE_THEMES,
  colorReplacements: CODE_COLOR_REPLACEMENTS,
};

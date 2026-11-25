/**
 * The flat config that probes one preset: does every rule→plugin reference in
 * it resolve inside a real ESLint?
 *
 * Shared by the source lock (`scripts/__tests__/ecosystem-integrity.test.ts`)
 * and the release gate on built `dist/` (`scripts/verify-dist-integrity.ts`),
 * so the two cannot drift: the release gate once lacked the Markdown step and
 * failed every release with `Could not find "gfm" in plugin "markdown"`.
 *
 * - A `files` matcher is prepended: a bare `{ plugins, rules }` preset is
 *   otherwise "File ignored" and never resolved.
 * - The preset's own `files`/`ignores` are stripped, so a narrowing preset
 *   cannot exclude the probe file.
 * - A preset on a Markdown language (`markdown/gfm`) documents that the
 *   consumer registers @eslint/markdown beside it, so the probe does too.
 */

export type ConfigBlock = Record<string, unknown>;

/** The preset's blocks with `files` and `ignores` removed. */
export function presetBlocks(config: unknown): ConfigBlock[] {
  return (Array.isArray(config) ? config : [config]).map((c) => {
    const { files: _files, ignores: _ignores, ...rest } = c as ConfigBlock;
    return rest;
  });
}

/** True when a block runs on a language plugin (`language: 'markdown/gfm'`). */
export function usesLanguage(blocks: readonly ConfigBlock[]): boolean {
  return blocks.some((b) => b.language !== undefined);
}

/**
 * Language plugins arrived in ESLint 9 (9.6); ESLint 8 rejects the
 * `language` key. A preset that declares one is not probed under 8.
 */
export function languagesSupported(eslintMajor: number): boolean {
  return eslintMajor >= 9;
}

/** The probe config for `config`, with `markdown` registered when it needs it. */
export function probeConfig(config: unknown, markdown: unknown): ConfigBlock[] {
  const blocks = presetBlocks(config);
  const needsMarkdown = blocks.some((b) =>
    String(b.language ?? '').startsWith('markdown/'),
  );
  return [
    { files: ['**/*.{js,jsx,ts,tsx,cjs,mjs}'] },
    ...(needsMarkdown ? [{ plugins: { markdown } }] : []),
    ...blocks,
  ];
}

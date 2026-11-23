/**
 * A RuleTester for the guidance rules: ESLint's own, on `@eslint/markdown`.
 *
 * Not the dual ESLint/oxlint tester the JS rules use — oxlint has no Markdown
 * language, so these rules declare `runtimes: ['eslint']` and are tested on
 * ESLint alone.
 */
import markdown from '@eslint/markdown';
import { RuleTester } from 'eslint';

export function markdownRuleTester(): RuleTester {
  return new RuleTester({
    plugins: { markdown },
    language: 'markdown/gfm',
  });
}

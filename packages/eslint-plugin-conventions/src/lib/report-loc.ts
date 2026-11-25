/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESTree } from '@interlace/eslint-devkit';

/**
 * A whole-line location for a Markdown report. `@eslint/markdown` counts
 * columns from 1 (`language.columnStart`), unlike ESTree's 0.
 */
export function lineLoc(line: number, text: string): TSESTree.SourceLocation {
  return {
    start: { line, column: 1 },
    end: { line, column: text.length + 1 },
  };
}

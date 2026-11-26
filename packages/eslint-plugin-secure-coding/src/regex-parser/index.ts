/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 *
 * The typed face of the vendored parser (see parser-core.ts for provenance).
 */
import type { Pattern } from './ast';
import {
  RegExpParserState,
  RegExpSyntaxError,
  RegExpValidator,
} from './parser-core';

export type * from './ast';
export { RegExpSyntaxError };

/** Which pattern syntax to accept: `u`, `v`, or neither (the legacy grammar with Annex B). */
export interface PatternFlags {
  unicode?: boolean;
  unicodeSets?: boolean;
}

/**
 * Parse the pattern text `source.slice(start, end)`.
 *
 * @throws {RegExpSyntaxError} when the text is not a valid pattern under those
 * flags. A caller that wants "decline, don't guess" lets that propagate.
 */
export function parsePattern(
  source: string,
  start: number,
  end: number,
  flags: PatternFlags,
): Pattern {
  const state = new RegExpParserState(source);
  new RegExpValidator(state).validatePattern(source, start, end, flags);
  return state.pattern as Pattern;
}

/** Same as {@link parsePattern}, for callers holding one parser the way they held regexpp's. */
export class RegExpParser {
  parsePattern(
    source: string,
    start = 0,
    end = source.length,
    flags: PatternFlags = {},
  ): Pattern {
    return parsePattern(source, start, end, flags);
  }
}

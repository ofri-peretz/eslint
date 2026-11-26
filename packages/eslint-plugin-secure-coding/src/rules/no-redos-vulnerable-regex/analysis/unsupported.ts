/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Thrown for a pattern element this analysis does not model: a `v`-flag class
 * holding multi-character strings, or a backreference that names several
 * groups. A caller treats it as "cannot analyse" and stays silent — it never
 * guesses from a failed analysis.
 */
export class UnsupportedPatternError extends Error {}

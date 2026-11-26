/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The regex AST types this directory consumes, re-exported from one place so
 * the producer of that AST can change without touching the analysis.
 */
export type {
  Alternative,
  Assertion,
  Backreference,
  CapturingGroup,
  Character,
  CharacterClass,
  CharacterSet,
  ClassIntersection,
  ClassStringDisjunction,
  ClassSubtraction,
  ExpressionCharacterClass,
  Group,
  Node,
  Pattern,
  Quantifier,
} from '../../../regex-parser/ast';

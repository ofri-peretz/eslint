/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The element type a JSX tag stands for, resolved the way
 * eslint-plugin-jsx-a11y 6.10.2 does (`src/util/getElementType.js`): through
 * `settings['jsx-a11y'].polymorphicPropName` (with `polymorphicAllowList`) and
 * `settings['jsx-a11y'].components`, and nowhere else. A component that no
 * setting maps keeps its own name, so a caller that wants DOM elements only
 * sees `TableCell` as `TableCell`, never as the `th` it may render.
 */
import type { TSESTree } from '@interlace/eslint-devkit';
import { findAttribute, staticAttributeValue } from './jsx-static';

interface A11ySettings {
  polymorphicPropName?: unknown;
  polymorphicAllowList?: unknown;
  components?: unknown;
}

/** `tag` is the tag name as written: `div`, `Foo`, `Ui.Cell`, `svg:a`. */
export function resolveElementType(
  node: TSESTree.JSXOpeningElement,
  tag: string,
  settings: Record<string, unknown>,
): string {
  const a11y = (settings['jsx-a11y'] ?? {}) as A11ySettings;
  let type = tag;

  const { polymorphicPropName, polymorphicAllowList } = a11y;
  if (typeof polymorphicPropName === 'string') {
    const attr = findAttribute(node, polymorphicPropName);
    // A bare attribute (`<Box as />`) is boolean `true` to jsx-ast-utils, which
    // never names an element; `staticAttributeValue` renders it as "true".
    const value = attr?.value === null ? null : staticAttributeValue(attr);
    const allowed =
      !Array.isArray(polymorphicAllowList) ||
      polymorphicAllowList.includes(type);
    if (value && allowed) type = value;
  }

  const { components } = a11y;
  if (
    typeof components === 'object' &&
    components !== null &&
    Object.hasOwn(components, type)
  ) {
    const mapped = (components as Record<string, unknown>)[type];
    if (typeof mapped === 'string') return mapped;
  }
  return type;
}

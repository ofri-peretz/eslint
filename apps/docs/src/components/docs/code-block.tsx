'use client';

/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { DynamicCodeBlock as FumadocsDynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import type { ComponentProps } from 'react';
import { CODE_HIGHLIGHT_OPTIONS } from '@/lib/code-highlight';

/**
 * fumadocs' `DynamicCodeBlock` defaults to `github-light`, whose comment grey
 * fails WCAG contrast on our tab background. Import this one instead; the
 * site's shared Shiki settings are not optional.
 */
export function DynamicCodeBlock(
  props: Omit<ComponentProps<typeof FumadocsDynamicCodeBlock>, 'options'>,
) {
  return (
    <FumadocsDynamicCodeBlock {...props} options={CODE_HIGHLIGHT_OPTIONS} />
  );
}

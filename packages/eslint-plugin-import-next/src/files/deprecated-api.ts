/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/** @deprecated Use newApi instead. */
export function oldApi(): void {}

export function newApi(): void {}

/** @deprecated Use newApi instead. */
export default function legacy(): void {}

export class PlainWidget {
  readonly kind = 'plain';
}

// A class decorator (`@deprecated`) and a decorator factory
// (`@deprecated()`) in one: called with no arguments it returns itself.
function deprecated(...args: unknown[]): any {
  return args.length > 0 ? undefined : deprecated;
}

@deprecated
export class OldWidget {
  readonly kind = 'old';
}

@deprecated()
export class OldGadget {
  readonly kind = 'gadget';
}

/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Is this package installed as `eslint-plugin-react`?
 *
 * npm, pnpm and Yarn place an aliased dependency
 * (`"eslint-plugin-react": "npm:eslint-plugin-react-features@x"`) in a folder
 * named for the alias, so the package's own files sit under
 * `node_modules/eslint-plugin-react/`, whatever name its `package.json` carries.
 * `eslint-plugin-react-features` itself sits under a folder with the longer
 * name, and the trailing separator keeps the two apart.
 *
 * It is a fact about where the files are, not a guess from a name in the code:
 * a bundler that moves the files away from `node_modules` reads as "not an
 * alias", and the explicit presets (`configs['react-recommended']`,
 * `configs.flat.recommended`) still work there.
 */
export function isInstalledAsReact(directory: string): boolean {
  return /[\\/]node_modules[\\/]eslint-plugin-react[\\/]/.test(
    `${directory.replace(/[\\/]+$/, '')}/`,
  );
}

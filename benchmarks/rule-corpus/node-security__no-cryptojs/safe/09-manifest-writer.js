/**
 * SAFE - a codemod that REMOVES the dependency. 'crypto-js' is an object key in
 * a package.json being rewritten, which is the opposite of using it.
 */
const { writeFile } = require('node:fs/promises');

export async function dropLegacyCrypto(manifestPath, manifest) {
  const deps = { ...manifest.dependencies };
  delete deps['crypto-js'];
  await writeFile(manifestPath, JSON.stringify({ ...manifest, dependencies: deps }, null, 2));
}

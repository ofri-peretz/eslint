/**
 * Cross-file fixture for no-tool-description-injection and the legacy tool()
 * classifier. Read from disk by src/utils/module-resolver.ts during tests.
 */
import { BRAND } from './brand.js';
import { loadBlurb } from './loader';
import { fromPackage } from 'some-package';

export const SEARCH = 'Search the docs';
export const LIST = `List ${BRAND} items`;
export const DYNAMIC = await loadBlurb();
export let MUTABLE = 'Mutable text';
const local = 'Local text';
export { local as RENAMED };
export { local as 'quoted-name' };
export { BRAND as REEXPORTED } from './brand';
export { MISSING_TOO } from 'some-package';
export const TOOLS = {
  search: { description: 'Search' },
  dyn: process.env.TOOL_DESCRIPTION,
};
export const FROM_PACKAGE = fromPackage;
export function describeTool(): string {
  return MUTABLE;
}
export function setMutable(text: string): void {
  MUTABLE = text;
}
export default 'Default description';

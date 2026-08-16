/**
 * SAFE - `import()` loads a module through the loader, which applies the page's
 * CSP and module resolution. It is not a code-string evaluator.
 */
export async function loadLocale(locale) {
  const module = await import(`./locales/${locale}.js`);
  return module.default;
}

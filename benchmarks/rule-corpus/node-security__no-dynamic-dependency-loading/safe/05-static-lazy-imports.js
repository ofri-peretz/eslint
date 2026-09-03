/**
 * SAFE - lazy loading with static specifiers. Deferring a module until it is
 * needed is a performance decision, not a security one; the set of modules
 * this file can reach is still exactly the four written below.
 */
export async function getFormatter(kind) {
  switch (kind) {
    case 'json':
      return (await import('./formatters/json.js')).default;
    case 'junit':
      return (await import('./formatters/junit.js')).default;
    case 'sarif':
      return (await import('./formatters/sarif.js')).default;
    default:
      return (await import('./formatters/stylish.js')).default;
  }
}

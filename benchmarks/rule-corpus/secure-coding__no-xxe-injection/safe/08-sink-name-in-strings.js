/**
 * SAFE - Every sink name appears, and none of them is a call. They are log
 * lines, a metric key and a documentation comment. `parseXml`, `parseFromString`
 * and `DOMParser` are text here.
 */
import { metrics } from '../lib/metrics';

// The importer used to call DOMParser().parseFromString directly; it now goes
// through the hardened parseXml wrapper in ../lib/xml.
export function recordImport(format) {
  metrics.increment('importer.parseFromString.calls', { format });
  return `handled by parseXml for ${format}`;
}

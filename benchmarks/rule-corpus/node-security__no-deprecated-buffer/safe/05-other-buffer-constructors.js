/**
 * SAFE - `ArrayBuffer`, `SharedArrayBuffer` and `DataView` are unrelated ECMA
 * constructors whose names merely CONTAIN "Buffer". None is deprecated and
 * none returns uninitialized memory (an ArrayBuffer is spec-zeroed).
 */
export function makeSharedRing(slots) {
  const backing = new ArrayBuffer(slots * 4);
  const shared = new SharedArrayBuffer(slots * 4);
  const view = new DataView(backing);
  view.setUint32(0, slots, false);
  return { backing, shared, view };
}

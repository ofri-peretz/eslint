/**
 * SAFE - `Buffer` here is a LOCAL class declared in this module: an audio ring
 * buffer over a Float32Array. `new Buffer(1024)` constructs that class, not
 * Node's deprecated `Buffer`. The global is never referenced in this file.
 *
 * A report is a false positive and proves the rule matches the SPELLING of the
 * callee instead of resolving its binding.
 */
class Buffer {
  constructor(capacity) {
    this.capacity = capacity;
    this.samples = new Float32Array(capacity);
    this.write = 0;
  }

  push(sample) {
    this.samples[this.write % this.capacity] = sample;
    this.write += 1;
  }
}

export function createRing(capacity) {
  return new Buffer(capacity);
}

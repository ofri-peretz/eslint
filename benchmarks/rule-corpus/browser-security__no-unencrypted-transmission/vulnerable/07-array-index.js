/**
 * VULNERABLE - Read out of a shard list by index, so the URL is an array
 * element rather than a named binding.
 */
const SHARDS = ['mongodb+srv://a.acme-corp.io', 'mongodb://b.acme-corp.io:27017'];

export function shard(i) {
  return SHARDS[i];
}

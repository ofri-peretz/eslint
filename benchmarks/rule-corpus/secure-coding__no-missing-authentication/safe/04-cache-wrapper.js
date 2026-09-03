/**
 * SAFE - An in-process LRU cache wrapper. There is no HTTP server in this file,
 * no express import, and no route: `get`, `delete` and `all` are the wrapper's
 * own storage API.
 *
 * `app` is a substring of `wrapper`, so an object-name substring test decides
 * this local cache is an Express application and reports every accessor on it
 * as an unauthenticated route.
 */
import { LRUCache } from 'lru-cache';

const store = new LRUCache({ max: 500 });

export function createCacheWrapper(namespace) {
  const wrapper = {
    get: (key) => store.get(`${namespace}:${key}`),
    set: (key, value) => store.set(`${namespace}:${key}`, value),
    delete: (key) => store.delete(`${namespace}:${key}`),
  };
  return wrapper;
}

export function readThrough(wrapper, key, load) {
  const hit = wrapper.get(key);
  if (hit !== undefined) return hit;
  const fresh = load(key);
  wrapper.set(key, fresh);
  return fresh;
}

export function evict(wrapper, key) {
  wrapper.delete(key);
}

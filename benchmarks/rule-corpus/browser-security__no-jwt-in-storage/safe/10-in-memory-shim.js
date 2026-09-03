/**
 * SAFE - A Map-backed shim with the Web Storage method names. It is not the
 * Web Storage global and nothing is persisted.
 */
const memoryStore = {
  data: new Map(),
  setItem(key, value) {
    this.data.set(key, value);
  },
};

memoryStore.setItem('access_token', ephemeralToken);

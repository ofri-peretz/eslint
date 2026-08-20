/**
 * SAFE - A wrapper object with a `getItem` of its own. `myStorage` is not
 * `localStorage`, and exact membership against the two web-storage globals is
 * what keeps every cache and every LRU out of this rule.
 */
const myStorage = createCache();
if (myStorage.getItem('user-role')) {
  warmRoleCache();
}

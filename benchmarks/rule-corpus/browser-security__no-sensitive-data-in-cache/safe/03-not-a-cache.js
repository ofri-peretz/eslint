/**
 * SAFE - A Map, a metrics counter and a Redux-ish store all answer to
 * .set/.put/.store. None of them is a Cache; a Cache comes from caches.open().
 */
cacheMap.set('creditLimit', 5000);
metrics.set('token_count', 42);
configStore.store('password-policy', policy);

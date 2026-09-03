/**
 * SAFE - A generated manifest. The URLs are unknowable at lint time.
 */
const cache = await caches.open('app-v1');
await cache.addAll(self.__WB_MANIFEST.map((entry) => entry.url));

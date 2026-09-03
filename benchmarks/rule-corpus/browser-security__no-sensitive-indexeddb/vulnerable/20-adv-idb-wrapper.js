/**
 * VULNERABLE (wave 2) - The `idb` package, which is how most production code
 * touches IndexedDB. `db.put(storeName, value)` is the same database write
 * with a different API shape.
 */
import { openDB } from 'idb';

const db = await openDB('app', 1);
await db.put('vault', { id: 1, password: user.password });

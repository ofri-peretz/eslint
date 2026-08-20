/**
 * SAFE - ADVERSARIAL. `register` is a very common method name. A router, a DI
 * container and a plugin host all have one, and none of them installs a worker.
 */
import { router } from './router';
import { container } from './container';

router.register(dynamicRoute);
container.register('logger', createLogger());

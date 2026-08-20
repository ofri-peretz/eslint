/**
 * SAFE - `<Image src>` is a COMPONENT prop, not an element attribute. It may
 * resolve to a loader, a placeholder, or a proxy that upgrades the scheme, so
 * there is no subresource to claim. Host elements are lowercase; components
 * are not.
 */
import { Image } from './image';

export function Hero() {
  return <Image src="http://cdn.acme-corp.io/hero.png" width={800} height={400} />;
}

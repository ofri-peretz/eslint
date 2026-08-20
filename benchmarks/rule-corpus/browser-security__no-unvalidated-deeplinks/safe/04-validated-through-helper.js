/**
 * SAFE - The CORRECT remediation: the inbound URL goes through a validator
 * before it reaches the sink. A value passed INTO a function is not the value
 * that comes back out, so the rule must not claim to know the result's origin.
 */
import { toAllowedDeepLink } from './deeplinks';

Linking.addEventListener('url', (event) => {
  Linking.openURL(toAllowedDeepLink(event.url));
});

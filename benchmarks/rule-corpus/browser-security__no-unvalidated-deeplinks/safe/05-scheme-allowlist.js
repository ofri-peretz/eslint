/**
 * SAFE - An exact allowlist of destination screens. The inbound value either
 * IS one of three known screens or it is not used at all.
 */
const ALLOWED_SCREENS = ['Home', 'Orders', 'Profile'];

export function openFromLink(screen) {
  if (ALLOWED_SCREENS.includes(screen)) {
    navigation.navigate(screen);
  }
}

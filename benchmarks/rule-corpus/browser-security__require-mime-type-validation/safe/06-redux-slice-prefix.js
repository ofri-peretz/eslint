/**
 * SAFE - ADVERSARIAL. A Redux slice action tested by prefix. `user/` LOOKS like
 * a media-type prefix and is not: `user` is not an IANA top-level type.
 */
export function isUserAction(action) {
  return action.type.startsWith('user/');
}

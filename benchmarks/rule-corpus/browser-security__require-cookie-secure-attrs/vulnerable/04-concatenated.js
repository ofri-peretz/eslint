/**
 * VULNERABLE - Three-term concatenation. This is the commonest real spelling and
 * it was never checked at all — a hardened cookie and an unhardened one both
 * reported nothing.
 */
document.cookie = 'cart=' + cartId + '; Path=/';

/**
 * SAFE - A saved cart. Storage access is not an authorization decision.
 */
if (localStorage.getItem('cart-draft-v2')) {
  rehydrateCart();
}

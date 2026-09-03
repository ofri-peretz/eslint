/**
 * SAFE - ADVERSARIAL. `authorship`, `casserole` and `preauthorize` all contain
 * an auth word as a SUBSTRING and none of them as a whole word.
 */
if (localStorage.getItem('preauthorized-payment-nonce-v1')) {
  resumeCheckout();
}

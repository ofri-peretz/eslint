/**
 * SAFE - The remediation. The card is posted straight to the payment processor
 * and never persisted anywhere the page can read back.
 */
export async function pay(card) {
  return fetch('https://payments.example.com/charge', {
    method: 'POST',
    body: JSON.stringify(card),
  });
}

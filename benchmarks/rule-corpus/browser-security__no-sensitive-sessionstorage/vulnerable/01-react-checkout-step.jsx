/**
 * VULNERABLE - A multi-step checkout parking the card in sessionStorage between
 * steps.
 */
export function PaymentStep({ card, onNext }) {
  function persistAndContinue() {
    sessionStorage.setItem('credit_card_number', card.pan);
    onNext();
  }

  return <button onClick={persistAndContinue}>Continue</button>;
}

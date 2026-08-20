/**
 * VULNERABLE - A React checkout step tracking the shipping address it just
 * collected.
 */
export function ShippingStep({ order }) {
  const onNext = () => {
    analytics.track('Shipping Entered', { step: 2, address: order.shippingAddress });
    advance();
  };
  return <button onClick={onNext}>Next</button>;
}

/**
 * VULNERABLE - The canonical CWE-359 shape, written the way a payments team
 * actually writes it: a declined charge is debugged by logging the card the
 * customer typed in. The PAN lands in the application log, which is shipped to
 * a third-party aggregator and retained for 90 days.
 */
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function chargeOrder(order) {
  try {
    return await stripe.charges.create({
      amount: order.totalCents,
      currency: 'usd',
      source: order.paymentToken,
    });
  } catch (err) {
    console.error('Charge declined for card', order.creditCardNumber);
    throw err;
  }
}

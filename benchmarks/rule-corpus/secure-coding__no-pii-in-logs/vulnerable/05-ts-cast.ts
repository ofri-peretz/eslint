/**
 * VULNERABLE - A CONTROLLED variant of fixture 01: the member expression and
 * the property name are unchanged, the only difference is a TypeScript
 * `as string` cast around it. If this file scores differently from 01, the
 * cast - not the danger - is what the rule is reading.
 */
interface PaymentRecord {
  id: string;
  creditCardLast4: unknown;
}

export function auditRefund(payment: PaymentRecord): void {
  console.warn('Refund requested for card', payment.creditCardLast4 as string);
}

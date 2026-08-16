/**
 * SAFE - An order-state machine. The class method is called `validateTransition`
 * and its parameter is called `data`, and neither of those facts makes an order
 * status a secret. `data.status === 'shipped'` compares two pieces of public
 * business state against string literals; there is nothing to leak by timing it.
 */
export type OrderStatus = 'draft' | 'open' | 'shipped' | 'cancelled';

export class OrderStateMachine {
  validateTransition(data: { status: OrderStatus }, next: OrderStatus): boolean {
    if (data.status === 'shipped') {
      return next === 'cancelled';
    }
    if (data.status === 'draft') {
      return next === 'open';
    }
    return false;
  }
}

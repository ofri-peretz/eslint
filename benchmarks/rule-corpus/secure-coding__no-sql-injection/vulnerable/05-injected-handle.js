/**
 * VULNERABLE - Handle passed in as a parameter - provenance outside the file entirely.
 */
export async function listOrders(db, req) {
  return db.query(`SELECT * FROM orders WHERE customer = '${req.params.id}'`);
}

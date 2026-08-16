/**
 * VULNERABLE - The record is reached through an array index; the field name is
 * still the evidence.
 */
const store = tx.objectStore('cards');
const record = pending[0];
store.add({ id: record.id, card_number: record.pan });

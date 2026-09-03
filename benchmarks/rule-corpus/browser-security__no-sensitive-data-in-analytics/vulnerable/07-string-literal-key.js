/**
 * VULNERABLE - A quoted key. It reaches the vendor identically, and a check
 * that only reads `Identifier` keys never sees it.
 */
analytics.track('Support Ticket', {
  'ticket-id': ticket.id,
  'user_phone': ticket.reporterPhone,
});

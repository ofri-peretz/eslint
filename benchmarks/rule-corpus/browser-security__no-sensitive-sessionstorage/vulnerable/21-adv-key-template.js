/**
 * VULNERABLE (wave 2) - A namespaced key built with a template literal.
 */
sessionStorage.setItem(`checkout:${orderId}:credit_card_number`, card.pan);

/**
 * SAFE - A domain object that happens to have a `location` property. Matching
 * on the property name alone turns every shipment tracker into an open redirect.
 */
const shipment = { location: { href: '' } };
shipment.location.href = req.query.next;

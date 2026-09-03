/**
 * SAFE - RFC 2606 reserves example.com precisely so nothing treats it as a real
 * endpoint. A placeholder cannot be a transmission risk.
 */
export const SAMPLE_REQUEST = () => fetch('http://example.com');

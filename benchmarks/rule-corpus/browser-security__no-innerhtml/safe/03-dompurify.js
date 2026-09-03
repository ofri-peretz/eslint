/**
 * SAFE - DOMPurify.sanitize is the canonical sanitiser.
 */
import DOMPurify from 'dompurify';
document.querySelector('#bio').innerHTML = DOMPurify.sanitize(user.bio);

/**
 * SAFE - DOMPurify with an options object is still DOMPurify.
 */
import DOMPurify from 'dompurify';
el.innerHTML = DOMPurify.sanitize(dirty, { ALLOWED_TAGS: ['b', 'i'] });

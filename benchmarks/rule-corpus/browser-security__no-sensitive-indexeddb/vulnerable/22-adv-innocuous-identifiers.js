/**
 * VULNERABLE (wave 2) - THE FALSE-NEGATIVE DIRECTION. The STORE name is the
 * evidence and it survives the rename.
 */
const a = b.transaction('c', 'readwrite');
const d = a.objectStore('c');
d.put({ e: 1, ssn: f.g });

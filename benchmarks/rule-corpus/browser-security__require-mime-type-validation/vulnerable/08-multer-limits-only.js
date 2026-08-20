/**
 * VULNERABLE - ADVERSARIAL. A `limits` option is present, and it caps file
 * SIZE. It validates no type at all. A rule that accepts any configuration
 * object as "configured" is satisfied by this — and one did, with a test
 * asserting it as correct.
 */
import multer from 'multer';

export const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

export const handler = upload.array('photos', 1);

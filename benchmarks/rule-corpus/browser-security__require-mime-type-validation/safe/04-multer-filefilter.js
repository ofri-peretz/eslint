/**
 * SAFE - The server half done properly: a `fileFilter` comparing the reported
 * media type against an exact allowlist.
 */
import multer from 'multer';

const ALLOWED = new Set(['image/png', 'image/jpeg']);

export const upload = multer({
  dest: 'uploads/',
  fileFilter(request, file, callback) {
    callback(null, ALLOWED.has(file.mimetype));
  },
});

export const handler = upload.single('avatar');

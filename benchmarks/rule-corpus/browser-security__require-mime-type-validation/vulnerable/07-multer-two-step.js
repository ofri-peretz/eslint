/**
 * VULNERABLE - The server half, in the spelling almost all real multer code
 * uses: configure once, attach per route. `dest` decides where the file lands,
 * not what it is allowed to be.
 */
import express from 'express';
import multer from 'multer';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/api/avatar', upload.single('avatar'), (request, response) => {
  response.json({ path: request.file.path });
});

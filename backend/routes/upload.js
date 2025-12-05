const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Very small, dependency-free upload endpoint that accepts a data URL payload.
// Expects JSON: { filename: "name.ext", data: "data:<mime>;base64,<base64>" }
router.post('/', async (req, res) => {
  try {
    const { filename, data } = req.body || {};
    if (!filename || !data || typeof data !== 'string') {
      return res.status(400).json({ error: 'filename and data are required' });
    }

    // basic size guard: reject > 8MB base64 payloads
    if (data.length > 8 * 1024 * 1024 * 1.4) { // approximate b64 overhead
      return res.status(413).json({ error: 'File too large (max ~8MB)' });
    }

    const match = data.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid data URL' });
    }

    const mime = match[1];
    const b64 = match[2];
    const buffer = Buffer.from(b64, 'base64');
    const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(filePath, buffer);

    const urlPath = `/uploads/${safeName}`;
    const absoluteUrl = `${req.protocol}://${req.get('host')}${urlPath}`;
    res.json({ url: absoluteUrl, path: urlPath, mime, size: buffer.length });
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;

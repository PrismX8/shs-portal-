const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Ensure correct MIME types for module/wasm assets.
app.use((req, res, next) => {
  if (req.path.endsWith('.mjs')) {
    res.type('text/javascript');
  } else if (req.path.endsWith('.wasm')) {
    res.type('application/wasm');
  }
  next();
});

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Start the server
app.listen(port, () => {
  console.log(`NautilusOS server running at http://localhost:${port}`);
  console.log(`Open http://localhost:${port}/index.html in your browser`);
});

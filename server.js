const http = require('http');
const express = require('express');
const path = require('path');
const { createBareServer } = require('@tomphttp/bare-server-node');

const app = express();
const port = process.env.PORT || 3000;
const bareServer = createBareServer('/bare/');

// Ensure correct MIME types for module/wasm assets.
app.use((req, res, next) => {
  if (req.path.endsWith('.mjs')) {
    res.type('text/javascript');
  } else if (req.path.endsWith('.wasm')) {
    res.type('application/wasm');
  }
  next();
});

// Serve static files from the current directory.
app.use(express.static(path.join(__dirname)));

const server = http.createServer((req, res) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

server.on('upgrade', (req, socket, head) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

// Start the server.
server.listen(port, () => {
  console.log(`NautilusOS server running at http://localhost:${port}`);
  console.log(`Bare server running at http://localhost:${port}/bare/`);
  console.log(`Open http://localhost:${port}/index.html in your browser`);
});

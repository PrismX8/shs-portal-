/**
 * Simple HTTP Server for Frontend
 * Run this to serve your frontend on http://localhost:8080
 * 
 * Usage: node serve-frontend.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Remove query string
  let filePath = '.' + req.url.split('?')[0];
  
  // Default to index.html
  if (filePath === './') {
    filePath = './index.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code == 'ENOENT') {
        // File not found - try index.html
        if (filePath !== './index.html') {
          fs.readFile('./index.html', (error, content) => {
            if (error) {
              res.writeHead(404, { 'Content-Type': 'text/html' });
              res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(content, 'utf-8');
            }
          });
        } else {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end('<h1>404 - File Not Found</h1>', 'utf-8');
        }
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`, 'utf-8');
      }
    } else {
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content, 'utf-8');
    }
  });
});

const HOST = '0.0.0.0';
let currentPort = PORT;

function printListeningInfo(port) {
  const os = require('os');
  const nets = os.networkInterfaces();
  const addrs = [];
  Object.values(nets).forEach((list) => {
    (list || []).forEach((net) => {
      if (!net || net.internal) return;
      if (net.family === 'IPv4') addrs.push(net.address);
    });
  });

  console.log(`\nFrontend server running at http://localhost:${port}`);
  console.log(`Serving files from: ${__dirname}`);
  console.log(`\nOpen: http://localhost:${port}/index.html`);
  if (addrs.length) {
    console.log(`\nLAN test (other device on same WiFi):`);
    addrs.forEach((ip) => console.log(`  http://${ip}:${port}/index.html`));
  }
  console.log('');
}

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    const tried = currentPort;
    currentPort += 1;
    console.warn(`Port ${tried} is in use. Trying ${currentPort}...`);
    setTimeout(() => {
      server.listen(currentPort, HOST);
    }, 150);
    return;
  }
  throw err;
});

server.on('listening', () => {
  printListeningInfo(currentPort);
});

server.listen(currentPort, HOST);


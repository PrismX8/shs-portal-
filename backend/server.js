const cors = require('cors');
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// Import routes
const contactRoutes = require('./routes/contact');
const moderationRoutes = require('./routes/moderation');
const visitorRoutes = require('./routes/visitors');
const friendsRoutes = require('./routes/friends');
const canvasRoutes = require('./routes/canvas');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const gameRoutes = require('./routes/games');
const privateChatRoutes = require('./routes/privateChats');
const uploadRoutes = require('./routes/upload');

// Import database
const db = require('./database/db');

// Import socket handlers
const socketHandlers = require('./socket/handlers');

const app = express();
const server = http.createServer(app);

// Allowed origins
const allowedOrigins = [
  'https://shsportal.vercel.app',
  'https://shs-portal-qa1n1tfz2-prism-xs-projects.vercel.app',
  'http://127.0.0.1:5501',
  'http://localhost:5501',
  'https://127.0.0.1:5501',
  'https://localhost:5501',
  'http://127.0.0.1:8080',
  'http://localhost:8080',
  'https://127.0.0.1:8080',
  'https://localhost:8080',
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'https://127.0.0.1:3000',
  'https://localhost:3000'
];

// Helper to decide if an origin is allowed
const isOriginAllowed = (origin) => {
  if (!origin) return true; // allow non-browser requests
  if (process.env.CORS_ALLOW_ALL === 'true') return true;
  return allowedOrigins.includes(origin);
};

// Configure CORS for Socket.io
const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  // Allow polling transport (required for Replit free tier)
  transports: ['polling', 'websocket'],
  allowEIO3: true
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    console.log('CORS request from origin:', origin);
    if (isOriginAllowed(origin)) {
      console.log('CORS allowed for origin:', origin);
      return callback(null, true);
    } else {
      console.log('CORS blocked for origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Ensure data directory exists (skip in serverless environments like Vercel)
const isServerless = process.env.VERCEL || process.env.LAMBDA_TASK_ROOT;
let uploadsDir;
if (!isServerless) {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  uploadsDir = path.join(dataDir, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

// Initialize database
db.init().then(() => {
  console.log('Database initialized successfully');
}).catch(err => {
  console.error('Database initialization error:', err);
  process.exit(1);
});

// Routes
app.use('/api/contact', contactRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/friends', friendsRoutes.router);
app.use('/api/canvas', canvasRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/private-chats', privateChatRoutes);
app.use('/api/upload', uploadRoutes);
if (uploadsDir) {
  app.use('/uploads', express.static(uploadsDir));
}

// Pass io instance to friends routes for socket events
friendsRoutes.setIO(io);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'SHS Game Hall Backend API',
    status: 'running',
    endpoints: {
      health: '/api/health',
      contact: '/api/contact',
      moderation: '/api/moderation',
      visitors: '/api/visitors',
      friends: '/api/friends',
      canvas: '/api/canvas',
      admin: '/api/admin?password=YOUR_PASSWORD'
    },
    websocket: 'Socket.io is available for real-time connections'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socketHandlers.handleConnection(socket, io);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    socketHandlers.handleDisconnect(socket, io);
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces for Fly.io

server.listen(PORT, HOST, () => {
  console.log(`🚀 Backend server running on ${HOST}:${PORT}`);
  console.log(`📡 Socket.io server ready for connections`);
  console.log(`🌐 CORS enabled for: ${process.env.CORS_ORIGIN || "*"}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    db.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  server.close(() => {
    db.close();
    process.exit(0);
  });
});


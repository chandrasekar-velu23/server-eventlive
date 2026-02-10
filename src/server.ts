import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { initializeWebSocket } from './services/websocket.service';
import { connectDB } from './config/db';
import { config } from './config';

const PORT = config.port;

// Connect to Database
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: config.frontendUrl,
    credentials: true,
  },
});

// Initialize WebSocket handlers
initializeWebSocket(io);

// Make io accessible to routes if needed
app.set('io', io);

server.listen(PORT, () => {
  console.log(`🚀 EVENTLIVE server running on port ${PORT}`);
  console.log(`🔌 WebSocket server ready`);
});


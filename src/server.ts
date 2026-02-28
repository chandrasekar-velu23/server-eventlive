import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { initializeWebSocket } from './services/websocket.service';
import { connectDB } from './config/db';
import { config } from './config';
import { seedUsers } from './seed';

const PORT = config.port;


connectDB().then(() => {
  if (config.env !== 'production') {
    seedUsers();
  }
});


const server = http.createServer(app);


const io = new SocketIOServer(server, {
  cors: {
    origin: config.frontendUrl,
    credentials: true,
  },
});


initializeWebSocket(io);


app.set('io', io);

server.listen(PORT, () => {
  console.log(`EVENTLIVE server running on port ${PORT}`);
});


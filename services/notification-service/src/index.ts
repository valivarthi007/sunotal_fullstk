import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

const app = express();
const PORT = process.env.PORT || 5006;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.get('/healthz', (_req, res) => {
  res.json({ service: 'notification-service', status: 'OK', socketClients: io.engine.clientsCount, timestamp: new Date().toISOString() });
});

// Event Notification Push API
app.post('/api/notifications/broadcast', (req, res) => {
  const { channel = 'general', event, data } = req.body;
  io.emit(event || 'notification', { channel, data, timestamp: new Date().toISOString() });
  res.json({ success: true, broadcastedTo: io.engine.clientsCount });
});

io.on('connection', (socket) => {
  console.log(`⚡ [Notification WS] Client connected: ${socket.id}`);
  socket.on('join_room', (room: string) => {
    socket.join(room);
  });
  socket.on('disconnect', () => {
    console.log(`⚡ [Notification WS] Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🔔 notification-service running on port ${PORT}`);
});

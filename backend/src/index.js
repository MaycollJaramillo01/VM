import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import reservationRoutes from './routes/reservations.js';
import configRoutes from './routes/config.js';
import reportRoutes from './routes/reports.js';
import { expirePendingReservations } from './services/reservationService.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: config.allowedOrigins } });
app.set('io', io);

app.use(helmet());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin)) return callback(null, origin);
      return callback(new Error('Not allowed'), false);
    },
  })
);
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/config', configRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

io.on('connection', (socket) => {
  socket.emit('hello', 'Bienvenido a Ángel Shop');
});

cron.schedule('*/5 * * * *', async () => {
  const count = await expirePendingReservations(io);
  if (count > 0) io.emit('stock:update');
});

async function seedAdmin() {
  const existing = await prisma.adminUser.findUnique({ where: { email: config.adminSeed.email } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(config.adminSeed.password, 10);
    await prisma.adminUser.create({ data: { email: config.adminSeed.email, passwordHash, role: 'ADMIN', name: 'Super Admin' } });
  }
}

seedAdmin();

server.listen(config.port, () => {
  console.log(`API listening on ${config.port}`);
});

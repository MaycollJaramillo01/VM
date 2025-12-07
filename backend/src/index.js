import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { Server } from 'socket.io';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';
import { config } from './config.js';
import publicRoutes from './routes/public.js';
import productsRoutes from './routes/products.js';
import adminRoutes from './routes/admin.js';
import { expirePendingReservations } from './services/reservationService.js';
import cron from 'node-cron';

const enableCron = process.env.ENABLE_CRON !== 'false';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { path: '/realtime', cors: { origin: config.allowedOrigins } });
app.set('io', io);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin)) {
        return callback(null, origin);
      }
      return callback(new Error('Not allowed'), false);
    },
  })
);
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

app.use('/api/public', publicRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const realtime = io.of('/');
realtime.on('connection', (socket) => {
  socket.on('join', (room) => socket.join(room));
});

if (enableCron) {
  cron.schedule('*/5 * * * *', async () => {
    const count = await expirePendingReservations(realtime);
    if (count > 0) realtime.emit('variant-stock-updated');
  });
}

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

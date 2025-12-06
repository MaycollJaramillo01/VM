import cron from 'node-cron';
import { expirePendingReservations } from './services/reservationService.js';

cron.schedule('*/5 * * * *', async () => {
  const count = await expirePendingReservations();
  if (count > 0) {
    console.log(`Expired ${count} pending reservations`);
  }
});

console.log('Cron worker initialized and waiting for scheduled tasks...');

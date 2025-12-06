import nodemailer from 'nodemailer';
import { config } from '../config.js';

const transportOptions = config.smtp.user
  ? {
      host: config.smtp.host,
      port: config.smtp.port,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    }
  : { jsonTransport: true };

export const mailer = nodemailer.createTransport(transportOptions);

export async function sendEmail({ to, subject, text, html }) {
  return mailer.sendMail({
    from: config.emailFrom,
    to,
    subject,
    text,
    html,
  });
}

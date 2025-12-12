import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  refreshSecret: process.env.REFRESH_SECRET || 'dev-refresh',
  customerTokenTtl: process.env.CUSTOMER_TOKEN_TTL || '12h',
  adminTokenTtl: process.env.ADMIN_TOKEN_TTL || '8h',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  emailFrom: process.env.EMAIL_FROM || 'Angel Shop <no-reply@angelshop.cr>',
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT || 1025),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  adminSeed: {
    email: process.env.ADMIN_DEFAULT_EMAIL || 'admin@angelshop.cr',
    password: process.env.ADMIN_DEFAULT_PASSWORD || '1234',
  }
};

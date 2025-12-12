# Ángel Shop - Sistema de reservas y ventas (Diseño inicial)

Este repositorio contiene el diseño inicial desde cero para una plataforma web de reservas y ventas parciales para **Ángel Shop** (Orotina, Costa Rica). Se centra en catálogo con variaciones, reservas sin pago, expiración automática, notificaciones y panel administrativo.

## Alcance de esta versión
- Modelo de datos en PostgreSQL y esquema Prisma listo para usar.
- Lineamientos de API REST, seguridad y flujos de negocio clave.
- Sin código de backend/frontend todavía: este es el punto de partida de arquitectura.

## Estructura
- `docs/data-model.md`: detalle de entidades, relaciones y reglas de negocio (stock, expiraciones, trazabilidad).
- `docs/api-design.md`: endpoints principales (clientes y admin), contratos y eventos de Socket.io.
- `prisma/schema.prisma`: esquema Prisma (PostgreSQL) listo para generar migraciones.

## Requisitos previos
- Node.js 20+ y npm instalados.
- PostgreSQL 15+ en tu máquina o instancia accesible.
- Opcional: servidor SMTP (por ejemplo, MailHog o el de tu proveedor) para pruebas de correo.

## Preparar la base de datos
1. Crea la base de datos `angelshop` y un usuario con permisos:
   ```bash
   psql -U postgres -c "CREATE DATABASE angelshop;"
   # Ajusta el usuario/contraseña según tu entorno
   ```
2. Define la variable `DATABASE_URL` con el formato `postgresql://<usuario>:<password>@<host>:<puerto>/angelshop`.

## Configurar y levantar el backend (API)
1. Instala dependencias:
   ```bash
   cd backend
   npm install
   ```
2. Crea un archivo `.env` en `backend/` con las variables mínimas:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/angelshop
   PORT=4000
   JWT_SECRET=dev-secret
   ADMIN_DEFAULT_EMAIL=admin@angelshop.cr
   ADMIN_DEFAULT_PASSWORD=changeme
   ALLOWED_ORIGINS=http://localhost:5173
   SMTP_HOST=localhost
   SMTP_PORT=1025
   EMAIL_FROM="Angel Shop <no-reply@angelshop.cr>"
   ```
   Ajusta credenciales y orígenes según tu entorno.
3. Genera cliente Prisma y aplica migraciones:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```
4. Inicia la API:
   ```bash
   npm run dev
   ```
   La API expone por defecto `http://localhost:4000`.

## Configurar y levantar el frontend (Vite + React)
1. Instala dependencias:
   ```bash
   cd frontend
   npm install
   ```
2. Crea un archivo `.env.local` en `frontend/` con el endpoint de la API:
   ```env
   VITE_API_URL=http://localhost:4000
   ```
3. Inicia la app en modo desarrollo:
   ```bash
   npm run dev -- --host --port 5173
   ```
   La SPA estará disponible en `http://localhost:5173` y consumirá la API configurada.

## Notas sobre correo y cron
- El backend envía correos mediante SMTP; si no tienes un servidor, puedes usar una instancia local de MailHog u otro servicio SMTP accesible.
- Las reservas pendientes se expiran cada 5 minutos mediante un cron interno; puedes desactivar el cron estableciendo `ENABLE_CRON=false` en el `.env` del backend si prefieres manejarlo externamente.

# Diseño de API y flujos – Ángel Shop

## Autenticación
- **Clientes (OTP)**
  - `POST /api/public/otp/request` – body `{ email?: string, phone?: string, channel: 'EMAIL'|'SMS'|'WHATSAPP' }` → envía OTP (Nodemailer/Twilio).
  - `POST /api/public/otp/verify` – body `{ target: string, code: string }` → crea/actualiza `CustomerContact` y devuelve token de sesión ligera (JWT corto, scope `customer`).
- **Admin (JWT)**
  - `POST /api/admin/auth/login` – body `{ email, password }` → JWT (role en payload).
  - `POST /api/admin/auth/refresh` – refresh tokens con rotación y lista de revocación.

## Catálogo público
- `GET /api/public/products` – filtros `category`, `garmentType`, `size`, `color`, `search`. Incluye stock disponible (onHand - reserved).
- `GET /api/public/products/:id` – detalle con variantes y stock en tiempo real (suscripción Socket.io `product:<id>` para eventos `variant-stock-updated`).

## Reservas (cliente)
- `POST /api/public/reservations` (auth cliente)
  - Body ejemplo:
  ```json
  {
    "items": [{ "variantId": "uuid", "quantity": 2 }],
    "expiresInHours": 48,
    "note": "Apartado por WhatsApp",
    "contact": { "name": "Ana", "phone": "+5068...", "email": "ana@example.com" }
  }
  ```
  - Lógica: valida stock disponible, incrementa `stockReserved` en transacción, crea `Reservation` en estado `PENDING`, programa expiración según `expiresInHours` (24/48/72), emite Socket.io `reservation:created` y `variant-stock-updated`.
- `GET /api/public/reservations/me` – lista de reservas por cliente (PENDING/CONFIRMED/EXPIRED/CANCELED).
- `GET /api/public/reservations/:id` – detalle y eventos.
- `POST /api/public/reservations/:id/cancel` – cliente cancela; revierte `stockReserved`, emite `reservation:updated`.

## Reservas (admin)
- `GET /api/admin/reservations` – filtros por estado, rango de fechas, contacto.
- `PATCH /api/admin/reservations/:id/status` – body `{ status: 'CONFIRMED'|'CANCELED' }`; CONFIRMED puede opcionalmente descontar `stockOnHand` y `stockReserved`. Registra `ReservationEvent` (actor ADMIN) y `InventoryAdjustment`.
- `POST /api/admin/reservations/manual-expire` – para correr lote manual (failsafe si cron falla).

## Catálogo (admin)
- `POST /api/admin/products` – crea producto y variantes iniciales.
- `PATCH /api/admin/products/:id` – actualiza metadatos.
- `POST /api/admin/products/:id/variants` – agrega variante.
- `PATCH /api/admin/variants/:id` – actualizar precio/stockOnHand (transacción + `InventoryAdjustment`).

## Reportes básicos
- `GET /api/admin/reports/reservations` – métricas: totales por estado, vencimiento, conversión (visitas→reservas usando GA4 events + internos `analyticsSource`).
- `GET /api/admin/reports/demand` – ranking de variantes por talla/color (usa `ReservationItem` y `InventoryAdjustment`).

## Socket.io eventos
- Namespace `/realtime` con auth opcional (cliente o admin token).
- Eventos emitidos:
  - `variant-stock-updated` payload `{ variantId, stockOnHand, stockReserved, available }`.
  - `reservation:created`, `reservation:updated` payload `{ id, status, expiresAt, items: [...] }`.
- Rooms sugeridos: `product:<productId>`, `variant:<variantId>`, `reservation:<id>`.

## Seguridad
- Helmet + CORS restringido a dominios de frontend conocidos.
- Rate limiting en OTP y login.
- Validación con Zod/express-validator en cada endpoint.
- reCAPTCHA/Turnstile en formularios de OTP y admin login.
- JWT separados por rol (customer/admin), expiración corta para clientes (12h) y refresh para admin.

## Cron jobs
- `*/5 * * * *` Expira reservas PENDING con `expiresAt <= now()` → set status EXPIRED, devuelve stock, envía correo de expiración, emite Socket.io.
- `0 */1 * * *` Reintenta envíos de correo/SMS fallidos (cola simple o tabla de notificaciones pendientes).
- `0 3 * * *` Backup de base de datos (pg_dump) + limpieza de OTP/refresh expirados.

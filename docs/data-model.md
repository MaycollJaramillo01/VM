# Modelo de datos – Ángel Shop

## Entidades principales
- **Product**: prenda con metadatos (categoría, tipo, descripción). 1-N con `ProductVariant`.
- **ProductVariant**: combinación talla/color con `sku`, precios y control de stock (`stockOnHand`, `stockReserved`).
- **CustomerContact**: datos mínimos del cliente (email/teléfono). Único por email/teléfono.
- **Reservation**: apartado sin pago; bloquea stock y expira automáticamente. 1-N con `ReservationItem`.
- **ReservationItem**: línea de variante reservada (cantidad, precio unitario, subtotal).
- **AdminUser**: usuarios del panel admin (JWT), con roles básicos.
- **OtpToken**: OTP por email/teléfono para autenticación ligera.
- **NotificationTemplate**: plantillas para correo/SMS/WhatsApp.
- **ReservationEvent**: auditoría de cambios de estado (quién/cuándo/por qué).
- **InventoryAdjustment**: auditoría de ajustes de stock (manuales o ligados a reservas).

## Relaciones clave
- Product 1-N ProductVariant (restricción única: `productId + size + color`).
- Reservation 1-N ReservationItem; ReservationItem N-1 ProductVariant.
- Reservation N-1 CustomerContact.
- InventoryAdjustment N-1 ProductVariant; opcionalmente vinculado a Reservation o AdminUser.
- ReservationEvent N-1 Reservation; `actorType` diferencia ADMIN/CUSTOMER/SYSTEM.

## Reglas de stock
- `ProductVariant` mantiene:
  - `stockOnHand`: stock físico disponible.
  - `stockReserved`: unidades retenidas por reservas PENDING/CONFIRMED.
  - **Disponible** = `stockOnHand - stockReserved` (calcular en consultas y Socket.io, no almacenar).
- Al crear reserva: incrementar `stockReserved` con transacción atómica (Prisma/SQL) y validar que `stockOnHand - stockReserved >= cantidad`.
- Al expirar/cancelar: decrementar `stockReserved` con transacción y registrar `InventoryAdjustment` (motivo EXPIRE/CANCEL/CONFIRM/MANUAL).
- Al confirmar venta física: opcionalmente disminuir `stockOnHand` y `stockReserved` en la misma transacción.

## Expiración robusta
- Campo `expiresAt` en Reservation (24/48/72h configurable) + `expiresInHours` guardado para auditoría.
- Cron (`node-cron`) cada 5 min: selecciona reservas PENDING con `expiresAt <= now()` y marca `EXPIRED` dentro de transacción, devolviendo stock (`stockReserved -= qty`).
- Recordatorio configurable (12h antes) usando `ReminderScheduledAt` derivado.
- `ReservationEvent` registra cambios (PENDING→EXPIRED, actor SYSTEM, metadata con lote/cron-run-id).

## Trazabilidad y métricas
- `ReservationEvent` provee historial completo de estados y notas.
- `InventoryAdjustment` guarda variación de stock, razón y vínculo a reserva/usuario.
- Campos de timestamp (`createdAt`, `updatedAt`, `confirmedAt`, `expiredAt`, `canceledAt`) facilitan reportes de conversión y vencimiento.
- Agregar `analyticsSource` en Reservation (utmSource, utmMedium, utmCampaign) para conversión básica y GA4/meta pixel.

## Catálogo y filtros
- Índices sugeridos: `Product(category, garmentType)`, `ProductVariant(size, color)`, `ProductVariant(sku unique)`, `Reservation(status, expiresAt)`, `Reservation(customerContactId, status)`.

## Control de autenticación
- `AdminUser` con `role` (ADMIN/MANAGER) y `passwordHash` (argon2/bcrypt).
- `OtpToken` con `channel` EMAIL/SMS/WHATSAPP, `target` (email o teléfono), `code`, `expiresAt`, `consumedAt`, `attempts`. Reutilizable para login de cliente.


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

## Próximos pasos sugeridos
1. Generar migraciones con Prisma (`npx prisma migrate dev`).
2. Implementar servicios de stock y reservas asegurando transacciones ACID.
3. Implementar cron de expiración con `node-cron` y notificaciones con Nodemailer/Twilio.
4. Construir frontend React (MUI) y panel admin usando los contratos descritos.
5. Añadir métricas internas y GA4/meta pixel según `docs/api-design.md`.

# MoniWatch

Paga desde la muñeca con **Nequi** o con **tarjeta (Wompi)**. El celular configura; el reloj paga.

| App | Tecnología | Carpeta |
| --- | --- | --- |
| Backend (API) | NestJS 11 · Prisma 6 · PostgreSQL | [`apps/backend`](apps/backend) |
| App del celular | Expo SDK 58 · React Native 0.88 | [`apps/mobile`](apps/mobile) |
| App del reloj | Expo SDK 58 para **Wear OS** | [`apps/watch/wearos`](apps/watch/wearos) |

- Producto y principios: [PRODUCT.md](PRODUCT.md). Identidad visual (*lima sobre tinta*): [DESIGN.md](DESIGN.md).
- El código, los nombres y los comentarios están en inglés. La interfaz está 100% en español (`src/i18n/es.ts` en cada app).
- No hay datos quemados: todo viene del backend o de variables de entorno.

---

## Cómo funciona

```
 Celular                        Backend                              Reloj (Wear OS)
 ───────                        ───────                              ───────────────
 Registro / login  ───────────▶ /auth/*  (JWT + refresh rotativo, revocable)
 Vincular Nequi o tarjeta ────▶ /payment-methods  (token cifrado AES-256-GCM)
   └ la tarjeta se tokeniza directo con Wompi; el número nunca llega al backend
                                /devices/pairing-requests ◀────────── 1. El reloj muestra un código
 2. Escribes el código ───────▶ /devices/pairing-requests/approve
                                /devices/pairing-requests/token ◀──── 3. El reloj recibe sus tokens (una vez)
 Límites y PIN del reloj ─────▶ /devices/:id/settings
                                /payment-methods, /devices/me ◀────── "Pagar con Nequi / Wompi"
                                /transactions ◀────────────────────── Monto (+ PIN) → check lima + vibración
                                /webhooks/wompi ◀── Wompi confirma pagos (firma verificada)
```

- **Idempotencia:** reintentar un pago nunca cobra dos veces.
- **Ningún pago se marca como fallido por un timeout:** si Wompi no responde a tiempo, el pago queda abierto.
  Lo cierra el webhook, la conciliación que se hace al consultar el pago o el proceso de vencimiento.
- **Revocación inmediata:** cerrar sesión o desvincular un reloj invalida sus tokens al instante.


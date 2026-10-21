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

## Desarrollo local

Requisitos: Node 24, Docker Desktop y, para el reloj, Android SDK con un emulador Wear OS.

```bash
npm run install:all
docker compose up -d                 # PostgreSQL local en el puerto 5433
```

### Backend

```bash
cd apps/backend
cp .env.example .env                 # completa los secretos (ver abajo)
npx prisma migrate deploy
npm run start:dev                    # http://localhost:3000/api/v1 · Swagger en /docs
```

Para generar los secretos:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"   # JWT_SECRET, TOKEN_FINGERPRINT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # TOKEN_ENCRYPTION_KEY (exactamente 32 bytes)
```

### Apps

```bash
cd apps/mobile && cp .env.example .env && npx expo start
cd apps/watch/wearos && cp .env.example .env && npx expo run:android
```

En los emuladores de Android, `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api/v1`. En un dispositivo físico,
usa la IP de tu PC en la red local o la URL pública de Render.

## Wompi (pagos reales con tarjeta)

1. En [comercios.wompi.co](https://comercios.wompi.co) → *Desarrolladores*, copia las 4 llaves de **Sandbox**.
2. Ponlas en `apps/backend/.env` (o en Render → *Environment*) y activa el modo real:

```env
WOMPI_MODE=LIVE
WOMPI_API_URL=https://sandbox.wompi.co/v1
WOMPI_PUBLIC_KEY=pub_test_...
WOMPI_PRIVATE_KEY=prv_test_...
WOMPI_INTEGRITY_SECRET=test_integrity_...
WOMPI_EVENTS_SECRET=test_events_...
```

3. La app del celular no guarda llaves: le pide al backend la llave pública y los enlaces de términos
   (`GET /payment-methods/providers/wompi`). El usuario acepta los términos de Wompi antes de guardar la tarjeta.
4. En el panel de Wompi, configura la **URL de eventos**: `https://<tu-api>.onrender.com/api/v1/webhooks/wompi`.

Tarjetas de prueba del sandbox: `4242 4242 4242 4242` (aprobada) y `4111 1111 1111 1111` (rechazada), con
cualquier fecha futura y cualquier CVC. Nequi sigue en modo simulado (`NEQUI_MODE=SIMULATED`).

## Publicar el backend (gratis: Render + Neon)

1. **Base de datos:** en [neon.tech](https://neon.tech), crea el proyecto `moniwatch` en la región
   **AWS US East 1 (N. Virginia)** y copia la *connection string* directa (incluye `sslmode=require`).
2. **API:** en [render.com](https://render.com) → *New* → **Blueprint** → elige este repositorio.
   Render lee [`render.yaml`](render.yaml) y te pide `DATABASE_URL` (pega la de Neon) y, si quieres, las llaves de Wompi.
   Los secretos (`JWT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `TOKEN_FINGERPRINT_SECRET`) los genera Render.
3. Cada push a `main` que toque `apps/backend` se despliega solo. Las migraciones corren al arrancar.
4. Pon la URL pública (`https://moniwatch-api.onrender.com/api/v1`) en `EXPO_PUBLIC_API_URL` de las dos apps.

> En el plan gratis, el servicio se duerme tras 15 minutos sin uso y tarda unos 50 s en despertar. Las apps
> lo despiertan apenas se abren, pero para uso real conviene un plan de pago (Render Starter o Railway Hobby).
> El [Dockerfile](apps/backend/Dockerfile) funciona igual en cualquier proveedor que soporte Docker.

## Pruebas

```bash
npm run verify            # typecheck de las 3 apps + pruebas del backend
npm run backend:test      # 42 pruebas: e2e (Jest + Supertest) y unitarias de Wompi
```

Las pruebas usan el PostgreSQL de `docker compose` en un esquema desechable (`test_<timestamp>`) que se crea
y se borra en cada corrida; nunca tocan la base de desarrollo.

## Seguridad

- Contraseñas y PIN con bcrypt. Refresh tokens, códigos de vinculación y *device codes* se guardan solo como hash.
- Tokens de proveedores cifrados con AES-256-GCM, con identificador de llave para poder rotarla.
- Las llaves privadas de Wompi solo viven en el backend; la firma de integridad se calcula en el servidor.
- Los webhooks de Wompi se verifican con su checksum, se deduplican y no aprueban pagos cuyo monto no coincide.
- Sesiones en Keychain/Keystore (`expo-secure-store`). `helmet`, validación estricta, rate limit por IP real
  (`TRUST_PROXY_HOPS`) y errores de base de datos traducidos para no filtrar detalles internos.

## Pendiente (fuera del alcance actual)

- **Nequi directo** (API de Nequi Conecta): el adaptador responde 501 en modo `LIVE`.
- **Apple Watch:** necesita una app SwiftUI aparte (`apps/watch/watchos`).
- **Firma de pagos por dispositivo:** `devicePublicKey` se guarda pero aún no se verifica.
- **Tipos compartidos:** los tipos de la API están duplicados en las dos apps (candidato a `packages/shared-types`).

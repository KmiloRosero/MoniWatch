# Smartwatch Pay

Pagos rápidos desde el reloj con **Nequi** y **Wompi**.

| App | Tecnología | Carpeta |
| --- | --- | --- |
| Backend (API) | NestJS 11 · Prisma 6 · SQLite | [`apps/backend`](apps/backend) |
| App del celular | Expo SDK 58 · React Native 0.88 | [`apps/mobile`](apps/mobile) |
| App del reloj | Expo SDK 58 para **Wear OS** | [`apps/watch/wearos`](apps/watch/wearos) |

> El código, los nombres y los comentarios están en inglés; toda la interfaz está en español
> (`src/i18n/es.ts` en cada app). Ningún dato está quemado: todo viene del backend o de variables de entorno.

---

## Cómo funciona

```
 Celular (Expo)                Backend (NestJS)                 Reloj (Wear OS)
 ──────────────                ────────────────                 ───────────────
 Registro / login  ──────────▶ /auth/*            (JWT + refresh rotativo)
 Vincular Nequi o tarjeta ───▶ /payment-methods   (token cifrado AES-256-GCM)
        │  (la tarjeta se tokeniza directo con Wompi; el número nunca llega al backend)
        │
        │                     /devices/pairing-requests ◀──── 1. El reloj pide un código
 2. Escribes el código ──────▶ /devices/pairing-requests/approve
                               /devices/pairing-requests/token ◀── 3. El reloj recibe sus tokens (una vez)
 Límites y PIN del reloj ────▶ /devices/:id/settings
                               /devices/me  ◀──────────────────── Límites, umbral de PIN
                               /payment-methods ◀──────────────── "Pagar con Nequi / Wompi"
                               /transactions ◀─────────────────── Monto (+ PIN) → PENDING → PROCESSING
                                     │                             → APPROVED / FAILED (check verde + vibración)
 Movimientos ◀───────────────  /transactions
                               /webhooks/wompi ◀── Wompi confirma pagos asíncronos (firma verificada)
```

- **Idempotencia:** cada pago lleva una `idempotencyKey`. Si el reloj pierde la conexión y reintenta,
  nunca se cobra dos veces.
- **Vinculación del reloj (RFC 8628):** el reloj muestra un código de 8 letras sin vocales
  (no se confunden 0/O ni 1/I). El código vence a los minutos y solo se puede usar una vez.
- **Límites por reloj:** máximo por pago, máximo en 24 horas y PIN desde cierto monto. El PIN se
  bloquea después de varios intentos fallidos.
- **Revocación inmediata:** cada petición revisa en la base de datos que la sesión siga activa, así que
  un reloj revocado o una sesión cerrada dejan de funcionar al instante.

## Requisitos

- Node.js 20 o superior y npm.
- Para el reloj: **Android SDK** con un emulador o reloj Wear OS 3+. Expo Go no existe para Wear OS,
  así que hay que compilar un *development build*.
- Para el celular: Expo Go o un emulador de Android/iOS.

## Puesta en marcha

```bash
npm run install:all
```

### 1. Backend

```bash
cd apps/backend
cp .env.example .env
```

Genera los secretos y pégalos en `.env`:

```bash
# JWT_SECRET y TOKEN_FINGERPRINT_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
# TOKEN_ENCRYPTION_KEY (debe ser exactamente 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

```bash
npm run prisma:deploy     # crea prisma/dev.db con todas las migraciones
npm run start:dev         # http://localhost:3000/api/v1
```

- Documentación interactiva de la API (Swagger): <http://localhost:3000/docs> (no se publica en producción).
- Estado del servicio: `GET /api/v1/health`.

### 2. App del celular

```bash
cd apps/mobile
cp .env.example .env      # ajusta EXPO_PUBLIC_API_URL
npx expo start
```

| Dónde corre | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| Emulador Android | `http://10.0.2.2:3000/api/v1` |
| Simulador iOS | `http://localhost:3000/api/v1` |
| Teléfono físico | `http://<IP-de-tu-PC-en-la-red>:3000/api/v1` |

### 3. App del reloj (Wear OS)

```bash
cd apps/watch/wearos
cp .env.example .env      # ajusta EXPO_PUBLIC_API_URL igual que arriba
npx expo run:android      # compila e instala en el emulador o reloj conectado
```

El plugin [`plugins/with-wear-os.js`](apps/watch/wearos/plugins/with-wear-os.js) marca el APK como app
exclusiva de reloj y *standalone* (habla con el backend por Wi-Fi/LTE, sin depender del celular).

### Primer uso de punta a punta

1. En el celular: **Crear cuenta** → **Agregar método de pago** (Nequi o tarjeta).
2. En el reloj: abre la app; verás un código de 8 letras.
3. En el celular: **Ajustes → Mis relojes → Vincular reloj** y escribe el código.
4. Opcional: **Ajustes → PIN de pago**, y en los ajustes del reloj elige límites y desde qué monto pedir PIN.
5. En el reloj: **Pagar con Nequi** → elige un monto → *Cargando…* → check verde y vibración.

## Pruebas y verificación

```bash
npm run verify            # typecheck de las 3 apps + pruebas e2e del backend
npm run backend:test      # solo las pruebas e2e (Jest + Supertest)
```

Las pruebas e2e usan una base de datos desechable (`apps/backend/prisma/test.db`) que se recrea en cada
corrida; nunca tocan `dev.db`. Cubren registro, login y refresh, revocación de sesiones, métodos de pago,
pagos (aprobados, rechazados, idempotencia y paginación), vinculación del reloj, límites, bloqueo de PIN,
webhooks de Wompi (firma, duplicados, monto alterado) y la expiración de transacciones atascadas.

## Configuración

Cada app documenta sus variables en su `.env.example`. Las más importantes:

| Variable (backend) | Para qué sirve |
| --- | --- |
| `PAYMENT_GATEWAY_MODE` | `SIMULATED` (por defecto) o `LIVE` |
| `PAYMENT_SIMULATOR_APPROVAL_RATE` | Porcentaje de pagos que el simulador aprueba (0 a 1) |
| `TRANSACTION_EXPIRATION_MINUTES` / `TRANSACTION_SWEEP_INTERVAL_SECONDS` | Cuándo y cada cuánto se vencen los pagos sin respuesta |
| `WOMPI_EVENTS_SECRET` | Secreto de eventos de Wompi; sin él, `/webhooks/wompi` responde 503 |
| `THROTTLE_LIMIT` / `THROTTLE_SENSITIVE_LIMIT` | Límite de peticiones por IP (general / login, PIN y vinculación) |

| Variable (reloj) | Para qué sirve |
| --- | --- |
| `EXPO_PUBLIC_QUICK_AMOUNTS` | Botones de monto rápido, por ejemplo `10000,20000,50000` |
| `EXPO_PUBLIC_MAX_KEYPAD_AMOUNT` | Tope del teclado; los límites del reloj en el backend aplican además de este |

## Seguridad

- Contraseñas y PIN con bcrypt. Refresh tokens, códigos de vinculación y device codes se guardan solo como hash SHA-256.
- Tokens de Nequi/Wompi cifrados con AES-256-GCM e identificador de llave, para poder rotarla.
- Los datos de la tarjeta van del celular directo a Wompi; el backend solo recibe el token.
- En los dispositivos, las sesiones se guardan en Keychain/Keystore (`expo-secure-store`), nunca en AsyncStorage.
- `helmet`, validación estricta (se rechazan campos desconocidos), límite de peticiones por IP y errores de Prisma traducidos para no filtrar detalles internos.

## Pendiente

Estos puntos dependen de credenciales o hardware que este repositorio no tiene:

- **Integraciones reales:** con `PAYMENT_GATEWAY_MODE=LIVE` los adaptadores responden 501. Falta implementar
  las llamadas HTTP de Nequi (suscripción y cobro push) y de Wompi (fuentes de pago y transacciones) con
  credenciales sandbox, y los webhooks de Nequi. Los de Wompi ya están implementados.
- **Formato de Wompi por confirmar:** la tokenización de tarjetas en modo `LIVE` (app del celular) y el
  checksum de los webhooks siguen el formato documentado por Wompi, pero no se han probado contra su sandbox.
- **Apple Watch:** React Native no corre en watchOS. Hace falta una app SwiftUI en `apps/watch/watchos`.
- **Firma de pagos por dispositivo:** el backend guarda `devicePublicKey`, pero todavía no verifica firmas por pago.
- **Escalar:** SQLite y el rate limit en memoria sirven para una sola instancia. Para varias instancias, cambiar
  a PostgreSQL (`provider` en `schema.prisma`) y usar un storage compartido (Redis) para el throttler.
- **Tipos compartidos:** los tipos de la API están duplicados en `apps/mobile` y `apps/watch`. Se pueden
  extraer a `packages/shared-types`.

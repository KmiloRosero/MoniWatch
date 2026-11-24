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

## Descargar las apps

Las apps listas para instalar están en **[Releases](https://github.com/KmiloRosero/MoniWatch/releases/latest)**:

| Archivo | Dónde se instala |
| --- | --- |
| `MoniWatch-celular.apk` | Celular Android (Android 7 o superior) |
| `MoniWatch-reloj.apk` | Reloj con **Wear OS** |

Ambas se conectan al servidor publicado (`https://moniwatch-api.onrender.com`) y cobran con **Wompi en producción**:
los pagos son reales. Wompi acepta pagos con tarjeta desde **$1.500**.

**Celular:** descarga el APK en el celular, ábrelo y permite *instalar apps desconocidas*.

**Reloj:** en el reloj activa *Opciones de desarrollador → Depuración ADB* y *Depuración por Wi-Fi*; luego, desde el PC:

```bash
adb connect <ip-del-reloj>:<puerto>
adb install MoniWatch-reloj.apk
```

**Primer pago:** en el celular crea tu cuenta → *Agregar comercio* (por nombre o código) → agrega tu tarjeta para ese
comercio → *Ajustes › Mis relojes › Vincular reloj* con el código que muestra el reloj. En el reloj: elige el comercio,
escribe el monto, confirma y paga. El dinero llega a la cuenta Wompi del comercio.

**¿Tienes un negocio?** En *Ajustes › Mi comercio* conecta las 4 llaves de tu cuenta Wompi y recibe un código para que
tus clientes te paguen.

> El servidor gratuito se duerme tras 15 minutos sin uso: la primera acción puede tardar unos 50 segundos.

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


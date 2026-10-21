# MoniWatch — Product

## What it is
MoniWatch lets people in Colombia pay from their wrist with **Nequi** or a **card (via Wompi)**.
The phone is where you set things up once; the watch is where you pay, in seconds, with the phone in your pocket.

## Who it is for
Urban Colombians, 18–40, who already pay with Nequi every day: coffee, bus top-ups, the corner store,
splitting a lunch. They value speed and certainty over features, and they distrust anything that makes
money feel vague ("¿sí pasó o no pasó?").

## Jobs to be done
1. **Pay in three taps** from the watch: method → amount → pay. Under five seconds end to end.
2. **Know immediately** whether the money moved: a clear yes or no, felt on the wrist (haptics), never ambiguous.
3. **Stay in control** from the phone: which methods the watch can use, how much it can spend, when it asks for a PIN,
   and the power to cut a lost watch off instantly.

## Surfaces
| Surface | Mode | Success looks like |
| --- | --- | --- |
| Watch (Wear OS) | Operate | Payment confirmed in a glance, one hand, arm raised |
| Phone (Expo) | Operate | Setup done in under two minutes; limits and history easy to check |
| Backend | — | Correct money, every time: idempotent, auditable, revocable |

## Voice
Spanish, *tú*, warm and direct, Colombian-neutral. Short sentences. Money is always written in full (`$ 20.000`),
never abbreviated in confirmations. No technical jargon, no blame ("Algo salió mal", not "Error 500").

## Principles
- **El reloj paga, el celular configura.** Nothing complex happens on the wrist.
- **Cero sorpresas con la plata.** Every state of a payment is explicit; retries never charge twice.
- **Un gesto, un pago.** The primary action is always the biggest, brightest thing on screen.

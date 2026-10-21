# MoniWatch — Design

## Concept: *lima sobre tinta*
A near-black ink world with one electric signal: **Moni Lime**. Lime means *money moves here*:
the button that pays, the check that confirms it, the watch-face mark of the brand. Everything else stays neutral,
so the lime is never decoration and never ambiguous.

The mark is a lime coin with a crown on its edge: a coin and a watch face at once, with a rounded **M** inside.

## Color

| Token | Light | Dark / Watch | Role |
| --- | --- | --- | --- |
| `background` | `#F7F8F3` paper | `#0A0C08` ink (watch: `#000000`) | Canvas |
| `surface` | `#FFFFFF` | `#14170F` (watch: `#16190F`) | Cards, chips, keys |
| `surfaceMuted` | `#EEF0E8` | `#1E2218` | Inputs, segmented track |
| `border` | `#DFE2D6` | `#2B3024` | Hairlines |
| `textPrimary` | `#0A0C08` | `#F2F4EC` | |
| `textSecondary` | `#5A6052` | `#A7AD9C` | |
| `primary` | `#C9F45A` | `#C9F45A` | The pay/confirm action (filled) |
| `onPrimary` | `#0A0C08` | `#0A0C08` | Text on lime |
| `accent` | `#3A5600` | `#C9F45A` | Links, focus, selection (lime is unreadable as text on paper) |
| `success` | `#3A7D00` | `#C9F45A` | Approved |
| `danger` | `#D93A26` | `#FF5F4A` | Failed, destructive |
| `warning` | `#A86A00` | `#F5B83D` | Pending |
| `provider.NEQUI` | `#FF3D9A` | `#FF3D9A` | Identity dot only |
| `provider.WOMPI` | `#A08CFF` | `#A08CFF` | Identity dot only |

Rules: lime is reserved for the primary action and success. Provider colors only appear as small identity dots,
never as fills. The watch background is pure `#000000` (OLED pixels off).

## Type
- **Space Grotesk** (600/700) for display, titles, amounts and the pairing code: geometric, slightly quirky,
  with confident numerals.
- **System font** (Roboto / SF) for body and UI text: legible at small sizes and native-feeling.
- Money always uses tabular numerals and is never truncated; long amounts step down a size.

## Shape and space
- 4pt spacing scale (`xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32`).
- Radii: 8 / 12 / 16, pills for watch chips and quick amounts.
- Touch targets: ≥48dp on the watch (chips 56dp), 52dp controls on the phone.

## Motion
- Press feedback: scale 0.96–0.97, 120–160ms, strong ease-out.
- On-screen movement (segmented indicator): ease-in-out, 220ms.
- The success mark (once per payment) earns more: ring draws, then the check strokes in, with a success haptic.
- `prefers-reduced-motion`: fades only, no movement.

## Assets
Generated from [`design/brand/mark.svg`](design/brand/mark.svg) by `design/brand/generate-assets.mjs`
into each app's `assets/` folder (icon, adaptive icon, splash).

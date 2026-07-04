# Wayta App Navigation Flow

## Core Visual Theme — Signal Green (canonical)

The app uses the **Wayta Signal Green** design system (full token sheet in `src/styles/tokens.css`; app-level tokens in `src/index.css`). The previous Neon Green/Gold palette is retired.

| Role | Dark ("ink", default) | Light ("paper") |
|---|---|---|
| Background | `#0a0a0a` (ink-0) | `#fafaf9` (paper) |
| Card / surface container | `#141414` / `#1c1c1c` | `#ffffff` / `#f5f5f4` |
| Primary accent | `#34d399` (emerald-400) | `#059669` (emerald-600) |
| Secondary accent | `#6ee7b7` (emerald-300) | `#047857` (emerald-700) |
| Text | `#fafaf9` | `#0a0a0a` |
| Muted text | `#a3a3a3` | `#57534e` |

- **Typography**: Space Grotesk (display/headings), Manrope (body/UI), JetBrains Mono (financial/technical)

## Screen Structure

### 1. Digital Menu (Catalog)
- **Header**: Venue Name/Location, Budget Remaining (Progress Bar).
- **Body**: Vertical scroll tiles (large imagery).
- **Footer**: Floating 'View Cart' button (Sticky to bottom, R-total).

### 2. Quick Checkout
- **Summary**: Itemized list with +/- controls.
- **CTA**: 'Slide-to-Pay' (Gesture component).

### 3. 'Wait-Less' Status
- **Centerpiece**: Animated progress ring (Green/Gold).
- **Details**: Bold, 4-digit Order ID.

### 4. Collection Token
- **Primary**: Dynamic QR Code (Auto-brightness: 100%).
- **Secondary**: List of ordered items.

## Guidance Strategy (Overlays & Bubbles)
- Overlays are modal components (`z-index: 100`) rendered over the main screen.
- Dismissal requires a button tap ('I understand'/'Got it'), triggering state change.

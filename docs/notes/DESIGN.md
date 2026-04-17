# Design System Document: The Kinetic Courtside Experience

## 1. Overview & Creative North Star: "The Digital Arena"
This design system moves beyond the static "tournament spreadsheet" to create a premium, editorial-grade sports experience. Our Creative North Star is **"The Digital Arena."** 

Just as a modern basketball arena uses high-contrast lighting, polished surfaces, and massive digital displays to create energy, this system utilizes high-contrast typography and deep tonal layering to simulate that same intensity. We reject the "flat" web. We embrace **Asymmetric Energy**—using purposeful overlaps, high-scale typography, and deep-space layering to make the user feel like they are courtside, not just behind a desk.

## 2. Colors: High-Octane Contrast
The palette is built on a foundation of professional depth (`surface`) punctuated by "Ignition" colors (`primary`).

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections. Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` section sitting on a `surface` background creates a clean, sophisticated break without the "cheap" feel of a stroke.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use the Material surface-container tiers to create depth:
*   **Base:** `surface` (#ffffff) — The light floor of the arena, representing a bright, modern court.
*   **Sub-Section:** `surface-container-low` (#f0f0f0) — Subtle depth for large grouping areas.
*   **Cards/Elements:** `surface-container` (#e0e0e0) or `surface-container-high` (#d0d0d0) — For active interactive elements.
*   **Elevated Modals:** `surface-bright` (#c0c0c0) — The highest point of focus.

### The "Glass & Gradient" Rule
To elevate the experience from "standard dashboard" to "luxury sports broadcast," use **Glassmorphism**. For floating headers or stats overlays, use a semi-transparent `surface` color with a `backdrop-blur` of 20px. 
*   **Signature Texture:** Use a subtle linear gradient for primary CTAs: `primary` (#FF6B00) to `primary-container` (#FF8C33) at a 135-degree angle. This mimics the curve and light-catch of a basketball.

## 3. Typography: The Editorial Impact
We utilize a triple-font system to balance sport-specific energy with high-density data readability.

*   **Display & Headlines (Space Grotesk):** This is our "Jumbotron" font. It is wide, technical, and aggressive. Use `display-lg` for tournament titles and `headline-lg` for scoreboards. The wide apertures of Space Grotesk feel "engineered."
*   **Body & Titles (Inter):** The workhorse. Inter provides neutral, high-legibility for player bios, game logs, and settings. It balances the aggression of the headlines with professional clarity.
*   **Labels (Lexend):** Used for micro-copy and data points. Lexend’s geometric clarity makes small numbers (stats, shot percentages) pop without feeling cramped.

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are often too "muddy" for a high-energy sports app. We achieve lift through light, not darkness.

*   **The Layering Principle:** Instead of a shadow, place a `surface-container-lowest` card on a `surface-container-low` section. The slight shift in the light gray spectrum creates a "soft lift."
*   **Ambient Shadows:** If a floating effect is required (e.g., a player profile hover), use a diffused shadow: `blur: 40px`, `y: 20px`, `opacity: 6%`. The color must be a tinted version of `on-surface` (#0D1117), not pure black.
*   **The Ghost Border:** If a border is required for accessibility (e.g., in a high-density grid), use the `outline-variant` (#bbbbbb) at **15% opacity**. It should be felt, not seen.

## 5. Components: Precision & Performance

### Buttons
*   **Primary:** Gradient-filled (`primary` to `primary-container`), bold `label-md` text in `on-primary`. Radius: `sharp` (0rem) for a sharp, modern edge.
*   **Secondary:** Ghost-style with a `primary` "Ghost Border." No fill.
*   **Tertiary:** Pure text using `primary` color, used for low-priority actions like "Cancel" or "View More."

### Cards & Dashboards
*   **The "No-Divider" Mandate:** Forbid the use of line dividers between list items. Use the **Spacing Scale** (specifically `spacing-4` or `spacing-6`) to create separation.
*   **Dynamic Stats Cards:** Use `surface-container-highest` for the card background. Integrate a "sparkline" chart using the `secondary` (#1A237E) color to provide a cool contrast to the warm orange primary accents.

### Interactive Charts
*   **The Pulse:** Use `primary` for the main data series. Use `secondary` for comparison data (e.g., "Season Average").
*   **Backgrounds:** Chart grids must use `outline-variant` at 10% opacity. Never use solid white grid lines.

### Chips (Player Tags/Status)
*   **Tournament Status:** Use `tertiary-container` for "Live" tags to create a "Gold/Championship" feel. 
*   **Selection:** Radius: `full` (9999px). This is the only place where we use fully rounded corners, contrasting against the more aggressive `sharp` radius of the main UI.

## 6. Do's and Don'ts

### Do:
*   **DO** use "Overhanging Elements." Let a player's high-quality cutout image break the top boundary of a card to create 3D depth.
*   **DO** use `display-lg` typography for single, massive numbers (e.g., a "23" jersey number) as a background watermark.
*   **DO** embrace white space. Use `spacing-16` (4rem) to separate major sections to allow the "Arena" to breathe.

### Don't:
*   **DON'T** use 100% pure white (#FFFFFF) for backgrounds. Use our `surface` (#ffffff) to maintain depth and color-grade.
*   **DON'T** use "Default" shadows. If it looks like a standard web shadow, it's wrong.
*   **DON'T** use thin, elegant serifs. This is a high-impact environment; the typography must feel like it can withstand a dunk.
*   **DON'T** use dividers. If you feel the need to draw a line, increase the spacing or shift the background tone instead.

---
**Director's Note:** This system isn't just a kit of parts; it's a rhythm. Every element should feel like it's in motion. Use the orange sparingly as "light"—it should highlight the most important action on the screen, just like the ball on the court.
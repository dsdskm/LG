## Overview

The design system is an elegant, warm-taupe editorial interface engineered for high readability and visual calmness. The base atmosphere is a **warm sand canvas** (`{colors.canvas}` — #eae8e2) paired with a **taupe-khaki header** (`{colors.header-bg}` — #8c8678) and a **muted warm-gray sidebar** (`{colors.sidebar-bg}` — #d3cfc4). Headlines run a **slab-serif display** ("Copernicus" / Tiempos Headline) at weight 400 with negative letter-spacing, paired with **StyreneB / Inter** body sans. The combination feels like a curated, premium editorial dashboard rather than a generic SaaS tool.

Brand voltage comes from the **taupe + selected-cream + rose-accent pairing** — primary actions and buttons anchor on **warm taupe** (`{colors.primary}` — #736e63 / #7d776a), active menu selections highlight in **soft off-white cream** (`{colors.surface-selected}` — #f4f3f0), and key highlights/AI indicators utilize **rich rose-crimson** (`{colors.accent-rose}` — #b91c4c / #bd2654).

The system has four core surface tiers that create natural depth:
1. **Warm Sand Canvas** (`{colors.canvas}` — #eae8e2) — default page floor and table head background
2. **Taupe Header** (`{colors.header-bg}` — #8c8678) — top navigation bar surface
3. **Muted Sidebar** (`{colors.sidebar-bg}` — #d3cfc4) — navigation panels and structural dividers
4. **Selected Menu / Card Highlight** (`{colors.surface-selected}` — #f4f3f0) — active sidebar items, content cards, and elevated callouts
5. **Dark Navy Product Surfaces** (`{colors.surface-dark}` — #172033 / #262f44) — code editors, terminal mockups, and deep dark containers

**Key Characteristics:**
- Warm sand canvas (`{colors.canvas}` — #eae8e2) with deep neutral-dark text (`{colors.ink}` — #111111).
- Distinct taupe header (`{colors.header-bg}` — #8c8678) providing clear top-level hierarchy.
- Warm-gray sidebar (`{colors.sidebar-bg}` — #d3cfc4) with cream active state (`{colors.surface-selected}` — #f4f3f0).
- Signature warm-taupe primary button (`{colors.primary}` — #736e63).
- Slab-serif display headlines via Copernicus / Tiempos Headline at weight 400 with negative letter-spacing.
- Dark navy code panels (`{colors.surface-dark}` — #172033 / #262f44) carrying code blocks, terminal panels, and model comparison data.
- Hierarchical border radius: `{rounded.md}` (8px) for buttons + inputs, `{rounded.lg}` (12px) for content cards, `{rounded.xl}` (16px) for hero containers, `{rounded.pill}` for badges.
- Section rhythm `{spacing.section}` (96px) with generous card padding `{spacing.xl}` (32px).

---

## Colors

### Brand & Accent
- **Primary / Button** (`{colors.primary}` — #736e63): Signature warm-taupe action color used for primary CTA buttons, active toggles, and main action elements.
- **Primary Hover** (`{colors.primary-hover}` — #6b655a): Hover state for primary buttons.
- **Primary Active** (`{colors.primary-active}` — #59544b): Press / active darker variant.
- **Header Background** (`{colors.header-bg}` — #8c8678): Top header bar background.
- **Accent Rose / AI Accent** (`{colors.accent-rose}` — #b91c4c / #bd2654): Rose-crimson accent used for selection highlights, AI status indicators, and focus badges.
- **Accent Rose Light** (`{colors.accent-rose-light}` — #cd7b94): Soft rose tone for hover/secondary AI highlights.
- **AI Gradient** (`{colors.ai-gradient}`): `linear-gradient(135deg, #cd7b94 0%, #bf2d59 55%, #b91c4c 100%)`.

### Surface
- **Canvas / Page Background** (`{colors.canvas}` — #eae8e2): Default page floor, table head background.
- **Header Surface** (`{colors.header-bg}` — #8c8678): Top navigation bar.
- **Sidebar Surface** (`{colors.sidebar-bg}` — #d3cfc4): Left sidebar and panel surface.
- **Surface Selected / Active** (`{colors.surface-selected}` — #f4f3f0): Selected sidebar menu items, elevated cards, and prominent content containers.
- **Surface Card** (`{colors.surface-card}` — #f5f0e8): Feature cards, subtle content panels.
- **Surface Dark** (`{colors.surface-dark}` — #172033): Code editor mockups, terminal panels, deep dark contrast surfaces.
- **Surface Dark Soft** (`{colors.surface-dark-soft}` — #262f44): Secondary dark containers and code block backgrounds.
- **Surface Dark Elevated** (`{colors.surface-dark-elevated}` — #354056): Elevated panels inside dark sections.
- **Hairline / Border** (`{colors.hairline}` — rgba(140, 134, 120, 0.22)): 1px border tone on warm surfaces.
- **Hairline Soft** (`{colors.hairline-soft}` — rgba(140, 134, 120, 0.12)): Subtle divider inside cards and tables.

### Text
- **Ink** (`{colors.ink}` — #111111): All headlines, primary labels, and high-emphasis text.
- **Body Strong** (`{colors.body-strong}` — #333333): Emphasized paragraphs, lead text, table headers (`#454749`).
- **Body** (`{colors.body}` — #555555): Default running-text color.
- **Muted** (`{colors.muted}` — #757575): Sub-headings, breadcrumbs, secondary labels.
- **Muted Soft** (`{colors.muted-soft}` — #8f8f8f): Captions, fine-print, copyright lines.
- **On Primary** (`{colors.on-primary}` — #ffffff): Text on primary taupe buttons and dark headers.
- **On Header** (`{colors.on-header}` — #ffffff): High-contrast white text on #8c8678 header.
- **On Dark** (`{colors.on-dark}` — #f2f8f9): Light text used on dark navy surfaces.
- **On Dark Soft** (`{colors.on-dark-soft}` — #9da3b2): Secondary labels in dark code mockups.

### Semantic
- **Success** (`{colors.success}` — #12b76a / #039855): Green status indicators, healthy resource dots.
- **Warning** (`{colors.warning}` — #f79009 / #dc6803): Warning callouts, caution badges.
- **Error** (`{colors.error}` — #f04438 / #d92d20): Error states, critical alert banners.
- **Information** (`{colors.information}` — #3887fd / #1d76fb): Informational tips and connection dots.

---

## Typography

### Font Family
The system runs **Copernicus** (or **Tiempos Headline** as substitute) as the slab-serif display face for headlines, and **StyreneB** (or **Inter** as substitute) as the humanist sans for body, navigation, and UI labels. **JetBrains Mono** handles code blocks. The fallback stack walks `Tiempos Headline, Garamond, "Times New Roman", serif` for display and `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` for body.

The display/body split is editorial:
- Copernicus serif (weight 400, negative tracking) → h1, h2, h3, hero display
- StyreneB sans (weight 400-500) → body, navigation, buttons, captions, labels
- JetBrains Mono → all code blocks and terminal text

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 64px | 400 | 1.05 | -1.5px | Hero h1 display headlines — Copernicus serif |
| `{typography.display-lg}` | 48px | 400 | 1.1 | -1px | Section heads — Copernicus |
| `{typography.display-md}` | 36px | 400 | 1.15 | -0.5px | Sub-section heads, model names — Copernicus |
| `{typography.display-sm}` | 28px | 400 | 1.2 | -0.3px | Pricing tier names, callout headlines — Copernicus |
| `{typography.title-lg}` | 22px | 500 | 1.3 | 0 | Major section labels — StyreneB |
| `{typography.title-md}` | 18px | 500 | 1.4 | 0 | Feature card titles, intro paragraphs |
| `{typography.title-sm}` | 16px | 500 | 1.4 | 0 | Connector tile titles, list labels |
| `{typography.body-md}` | 16px | 400 | 1.55 | 0 | Default running-text — StyreneB |
| `{typography.body-sm}` | 14px | 400 | 1.55 | 0 | Footer body, fine-print |
| `{typography.caption}` | 13px | 500 | 1.4 | 0 | Badge labels, captions |
| `{typography.caption-uppercase}` | 12px | 500 | 1.4 | 1.5px | Category tags, "NEW" badges |
| `{typography.code}` | 14px | 400 | 1.6 | 0 | Code blocks — JetBrains Mono |
| `{typography.button}` | 14px | 500 | 1.0 | 0 | Standard button labels |
| `{typography.nav-link}` | 14px | 500 | 1.4 | 0 | Top-nav menu items |

### Principles
Display sizes use weight 400 (regular), never bold. Negative letter-spacing (-0.3 to -1.5px) is essential — Copernicus without it reads as off-brand. The serif character gives the product its literary, considered voice.

Body type stays at weight 400 for paragraphs, weight 500 for labels and emphasized phrases. The sans body is humanist (StyreneB/Inter) — never geometric.

---

## Layout

### Spacing System
- **Base unit:** 4px.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 96px.
- **Section padding:** `{spacing.section}` (96px) — modern-SaaS rhythm.
- **Card internal padding:** `{spacing.xl}` (32px) for feature cards, pricing tier cards; `{spacing.lg}` (24px) for code-window cards.
- **Sidebar padding:** 16px (`1.6rem`) with 4px item gap.

### Grid & Container
- **Max content width:** ~1200px centered.
- **Editorial body:** Single 12-column grid; hero uses 6/6 split (h1 left, illustration/mockup right).
- **Feature card grids:** 3-up at desktop, 2-up at tablet, 1-up at mobile.
- **Connector tile grids:** 4-up or 6-up at desktop, 2-up at tablet, 1-up at mobile.

---

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, no border | Canvas body sections, page background |
| Soft hairline | 1px `{colors.hairline}` border (`rgba(140, 134, 120, 0.22)`) | Inputs, table cells, container borders |
| Selected surface | `{colors.surface-selected}` (#f4f3f0) background | Active sidebar items, elevated cards |
| Dark surface card | `{colors.surface-dark}` (#172033) background | Code editor mockups, terminal panels |
| Subtle drop shadow | `0 0.5rem 1.5rem 0 rgba(0, 0, 0, 0.05)` | Hover-elevated states and floating cards |

The elevation philosophy is **color-block first, shadow rare**. Depth comes from the `#8c8678` (header) vs `#d3cfc4` (sidebar) vs `#eae8e2` (canvas) vs `#f4f3f0` (selected) contrast.

---

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Badge accents and tiny dropdowns |
| `{rounded.sm}` | 6px | Small inline buttons, dropdown items |
| `{rounded.md}` | 8px | Standard CTA buttons, text inputs, category tabs |
| `{rounded.lg}` | 12px | Content cards (feature, pricing, code-window) |
| `{rounded.xl}` | 16px | Hero illustration container, marquee components |
| `{rounded.pill}` | 9999px | Badge pills, status tags |
| `{rounded.full}` | 50% | Avatar substitutes, icon buttons |

---

## Components

### Top Navigation
**`top-nav`** — Pinned header bar. 64px tall, `{colors.header-bg}` (#8c8678) background. Carries brand wordmark at left in `{colors.on-header}` (#ffffff), horizontal menu items in `{typography.nav-link}` (14px / 500), menu active background `rgba(17, 17, 17, 0.2)`, hover background `rgba(17, 17, 17, 0.1)`, right-side cluster with account pill `rgba(255, 255, 255, 0.1)`.

### Sidebar Navigation
**`sidebar-nav`** — Side navigation container. Background `{colors.sidebar-bg}` (#d3cfc4), text `{colors.ink}` (#111111).
- **Default Item**: Transparent background, text `{colors.ink}`.
- **Hover Item**: `rgba(255, 255, 255, 0.5)` background.
- **Selected Item (`menu-selected`)**: Background `{colors.surface-selected}` (#f4f3f0), text `{colors.ink}` with `{rounded.md}` (8px) radius.

### Buttons
**`button-primary`** — Signature taupe CTA button. Background `{colors.primary}` (#736e63), text `{colors.on-primary}` (#ffffff), type `{typography.button}` (14px / 500), padding 12px × 20px, height 40px, rounded `{rounded.md}` (8px).
- Hover: `{colors.primary-hover}` (#6b655a)
- Active / Press: `{colors.primary-active}` (#59544b)

**`button-secondary`** — Warm sand button with hairline border. Background `{colors.canvas}` (#eae8e2), text `{colors.ink}`, 1px hairline border (`rgba(140, 134, 120, 0.22)`), same padding + height + radius as primary.

**`button-secondary-on-dark`** — Used over dark cards. Background `{colors.surface-dark-elevated}` (#354056), text `{colors.on-dark}` (#f2f8f9).

**`text-link`** — Inline body links in `{colors.primary}` (#736e63) or `{colors.accent-rose}` (#b91c4c). Underlined on press.

### Cards & Containers
**`hero-band`** — Warm sand canvas hero with a 6-6 grid: h1 + sub-headline + button row on the left, hero illustration or code mockup on the right. Vertical padding `{spacing.section}` (96px).

**`feature-card`** — Feature card on canvas. Background `{colors.surface-selected}` (#f4f3f0) or `{colors.surface-card}` (#f5f0e8), 1px border `{colors.hairline}`, rounded `{rounded.lg}` (12px), internal padding `{spacing.xl}` (32px).

**`code-window-card`** — Dark navy card showing code editor with line numbers, syntax-highlighted code in `{typography.code}` (JetBrains Mono). Background `{colors.surface-dark}` (#172033) with `{colors.surface-dark-soft}` (#262f44) for inner code block, rounded `{rounded.lg}`, padding `{spacing.lg}` (24px).

**`callout-card-taupe`** — Full-bleed callout card carrying a major CTA. Background `{colors.primary}` (#736e63), text `{colors.on-primary}` (#ffffff), rounded `{rounded.lg}`, padding `{spacing.xxl}` (48px).

### Tables
**`table-container`** — Standard data table.
- **Header (`th`)**: Background `{colors.canvas}` (#eae8e2), text `#454749`, font-weight 600, border-bottom 1px `{colors.hairline}`.
- **Body (`td`)**: Text `{colors.body-strong}` (#333333), border-bottom 1px `{colors.hairline}`.
- **Row Hover**: Background `rgba(255, 255, 255, 0.4)`.

### Badges / Tags
**`badge-pill`** — Small pill label. Background `{colors.surface-selected}` (#f4f3f0), text `{colors.ink}` (#111111), type `{typography.caption}` (13px / 500), rounded `{rounded.pill}`, padding 4px × 12px.

**`badge-accent`** — Rose accent badge for "NEW", "AI", featured highlights. Background `{colors.accent-rose}` (#b91c4c), text `#ffffff`, type `{typography.caption-uppercase}` (12px / 500 / 1.5px tracking), rounded `{rounded.pill}`, padding 4px × 12px.

---

## Do's and Don'ts

### Do
- Anchor the top header on `#8c8678`, the sidebar on `#d3cfc4`, the page canvas on `#eae8e2`, and the selected item on `#f4f3f0`.
- Use `#736e63` for primary CTA buttons with `#6b655a` hover and `#59544b` active states.
- Use Copernicus serif for display headlines (h1, h2, h3) with negative letter-spacing. Pair with StyreneB / Inter sans body.
- Use dark navy (`#172033` / `#262f44`) for code windows, terminal mockups, and dark chrome surfaces.
- Use `#b91c4c` / `#bd2654` for selective AI highlights and active status badges.
- Apply `{spacing.section}` (96px) between major sections.

### Don't
- Don't use cold blue or generic saturated grays. The warm taupe/sand palette is the defining character.
- Don't bold serif display weight (keep Copernicus at weight 400).
- Don't overuse the rose accent (`#b91c4c`). Reserve it for focused highlights and AI indicators.
- Don't add high-intensity drop shadows. Rely on color blocking (`#8c8678` vs `#d3cfc4` vs `#eae8e2` vs `#f4f3f0`) for depth.
- Don't use pure black text (`#000000`) on warm canvas; use `{colors.ink}` (`#111111`) for softer, literary contrast.

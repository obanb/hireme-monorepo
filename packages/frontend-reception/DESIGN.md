# Reception Frontend Design System

---

## Current — "FigmaDesk" (v3)

> Implemented. Inspired by `figma.html` (FrontDesk 2.0 prototype).
> Goal: compact, consistent, information-dense — the same visual language across every page.

---

### Palette

```css
/* Core */
--navy:   #1C2B3A   /* primary dark — sidebar, fg */
--accent: #E8A045   /* amber — active nav, CTAs, links */

/* Status */
--green:  #3A9E6F
--red:    #C84B4B
--blue:   #4A7FCB   /* pending / info */
--yellow: #C88A20   /* warning / no-room */

/* Canvas */
--bg:          #F4F6F9
--bg-surface:  #FFFFFF
--border:      rgba(28,43,58,.09)
--border-strong: rgba(28,43,58,.18)

/* Text */
--fg:       #1C2B3A
--fg-muted: #4A5E72
--fg-subtle: #8A9BB0
```

Status variant pattern (bg + border for each):
```css
--status-green-bg:   rgba(58,158,111,.09)
--status-red-bg:     rgba(200,75,75,.09)
--status-yellow-bg:  rgba(232,160,69,.09)
--status-pending-bg: rgba(74,127,203,.09)
```

---

### Typography

| Token | Font | Usage |
|---|---|---|
| `--font-display` | DM Sans | Headings (alias for body, kept for compat) |
| `--font-body` | DM Sans | All UI text |
| `--font-mono` | DM Mono | IDs, codes, numbers, clock |

Base: `13px`, `line-height: 1.5`

Sizes in use:
- `9–10px` — section group labels in sidebar / uppercase table headers
- `11–11.5px` — table cells, meta, secondary text
- `12px` — filter buttons, chips, badges, action buttons
- `13px` — primary body / table row text
- `14px` — page header title

---

### Layout

#### Sidebar
- Width: `200px`, background: `#1C2B3A` (navy)
- Logo: `O·R·E·A` in DM Mono, white, `letter-spacing: 0.18em`
- Section labels: `rgba(255,255,255,.28)`, 9px uppercase
- Nav item: 12.5px, `padding: 7px 8px`, `border-radius: 6px`
- **Active:** amber text `#E8A045`, `bg: rgba(232,160,69,.12)`, `border-left: 2.5px solid #E8A045`
- **Hover:** `rgba(255,255,255,.06)` bg, `rgba(255,255,255,.85)` text
- Footer: live clock in DM Mono, `rgba(255,255,255,.75)`

#### Page Header (every page — 52px)
```
height: 52px
background: #FFFFFF
border-bottom: 1px solid var(--border)
padding: 0 24px
display: flex; align-items: center; gap: 14px
```

Structure:
- **Left:** amber icon + `14px 600` page title + `11.5px` subtitle in `var(--fg-subtle)`
- **Right:** primary action button(s)
- **Detail pages:** `back link → / → record ID (mono) → name → metadata`, status badge on far right

#### Content Area
```
padding: 20px 24px 60px
```

---

### Components

#### Table / List
```
border-radius: 9–11px
border: 1px solid var(--border)
background: #FFFFFF
overflow: hidden
```
- Header row: `height: 36px`, `background: var(--bg)`, 10.5px uppercase `var(--fg-subtle)`
- Data row: `~44px`, `border-bottom: 1px solid var(--border)`, hover `var(--bg-hover)`
- Flagged rows: `box-shadow: inset 3px 0 0 0 <status-color>`

#### Stat Cards
```
background: #FFFFFF
border: 1px solid var(--border)
border-top: 3px solid <color>
border-radius: 9px
padding: 14px 16px
```
Value: DM Mono, 22–26px bold. Label: 11px muted.

#### Buttons

**Primary (amber):**
```
background: var(--accent)
color: #fff
border-radius: 7px
padding: 6px 13px
font-size: 12px; font-weight: 500
```

**Secondary (outline):**
```
background: #FFFFFF
border: 1px solid var(--border-strong)
color: var(--fg-muted)
border-radius: 7px; padding: 5–6px 11–13px
```

**Period tabs:**
```
Wrapper: background: var(--bg), border-radius: 7px, padding: 3px
Active tab: background: var(--navy), color: #fff, border-radius: 5px
```

#### Chips / Badges
```
font-size: 10–10.5px; font-weight: 500–700
border-radius: 4px; padding: 1–2px 6–7px
background: rgba(<color>,.10); color: <color>
optional border: 1px dashed rgba(<color>,.4)
```

#### Inputs / Selects
```
background: var(--bg-surface)
border: 1px solid var(--border-strong)
border-radius: 7px; padding: 6–7px 12px
font-size: 12–13px; height: 32px
```
Focus: `border-color: var(--accent-border)`, `box-shadow: 0 0 0 3px var(--accent-light)`

#### Scrollbar
```css
::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-thumb { background: rgba(28,43,58,.18); border-radius: 3px; }
```

---

### Status Colors Reference

| Status | Color | Usage |
|---|---|---|
| GREEN | `#3A9E6F` | Passed, checked in, confirmed |
| RED | `#C84B4B` | Issues requiring action |
| YELLOW | `#C88A20` | Warnings, no room assigned |
| PENDING / INFO | `#4A7FCB` | In progress, awaiting |
| NONE | `#8A9BB0` | Unclassified |

### Provider Colors

| Source | Color |
|---|---|
| Direct (BOOKING_ENGINE) | `#4A7FCB` |
| Booking.com | `#0070C9` |
| Expedia | `#C88A20` |
| HotelTime | `#3A9E6F` |
| Airbnb | `#E11D48` |

---

### Do / Don't

**Do:**
- DM Mono for all IDs, codes, numeric values, and the sidebar clock
- `var(--border)` = `rgba(...)` — not solid hex
- 52px white page header on every page
- Amber for active state and primary CTA only
- Status colors strictly semantic

**Don't:**
- Use old sky blue `#0EA5E9` anywhere — replaced by amber
- Use `padding: 28px 32px` on page content — use `20px 24px`
- Add box-shadow to table containers — border only
- Add animation/wave to list rows

---

---

## v2 Proposal — "Night Lobby" (not implemented, archived)

> A warm dark design direction considered and rejected in favour of FigmaDesk.
> Preserved for reference.

**Concept:** Warm near-black canvas (`#0C0C0A`), brass accent (`#C9A84C`), IBM Plex type family, luminous status colors. Inspired by the ambiance of a luxury hotel lobby at night.

Key tokens:
```css
--bg:      #0C0C0A    --accent:  #C9A84C
--fg:      #F2E8D5    --font-display: 'Cormorant Garamond'
--font-body: 'IBM Plex Sans'    --font-mono: 'IBM Plex Mono'
--status-red:    #FF5555    --status-green: #3DD68C
--status-yellow: #FFC044    --status-pending: #818CF8
```

Reason not implemented: user preferred the compact light-theme direction ("bright, white, fresh, Figma-style").

---

---

## v1 Reference — "Morning Brief" (superseded)

> Light theme implemented before FigmaDesk. Superseded.

```css
--bg: #EEF2F7    --accent: #0EA5E9 (sky blue)
--font-display: 'Syne'    --font-body: 'DM Sans'    --font-mono: 'JetBrains Mono'
--sidebar-bg: #FFFFFF    --sidebar-width: 210px
--status-green: #059669    --status-red: #DC2626
```

Why replaced: inconsistent page headers, excessive padding, accent color clashed with OREA brand aesthetic, Syne felt generic.

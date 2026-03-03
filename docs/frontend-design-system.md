# Frontend Design System — Obsidian Ledger

Design reference for all future frontend iterations of the Hotel CMS.
Last updated: 2026-03-03

---

## Concept

**"Obsidian Ledger"** — A dark luxury hotel management aesthetic.
Precision typography, warm gold accents, and refined glass surfaces.
Works in both light (warm cream) and dark (near-black) themes.

The one thing visitors remember: **everything feels deliberately considered** — no generic defaults, no system fonts, no purple gradients on white.

---

## Color System

All colors are defined as CSS custom properties in `globals.css`.
Never hardcode hex values in components — always reference variables.

### Light mode (`:root`)

| Variable             | Value       | Usage                              |
|----------------------|-------------|------------------------------------|
| `--background`       | `#F7F4EF`   | Page background (warm cream)       |
| `--sidebar-bg`       | `#FAFAF8`   | Sidebar background                 |
| `--sidebar-border`   | `rgba(0,0,0,0.07)` | Sidebar right border          |
| `--gold`             | `#A8783A`   | Primary accent (darker for light)  |
| `--gold-light`       | `#C9A96E`   | Secondary gold, gradients          |
| `--surface`          | `rgba(0,0,0,0.025)` | Card / panel fill             |
| `--surface-hover`    | `rgba(0,0,0,0.04)`  | Hover state for surfaces      |
| `--card-border`      | `rgba(0,0,0,0.07)`  | Card outlines                 |
| `--text-primary`     | `#0D0E14`   | Headings, values, key labels       |
| `--text-secondary`   | `rgba(13,14,20,0.55)` | Body text, nav labels        |
| `--text-muted`       | `rgba(13,14,20,0.30)` | Timestamps, hints, captions  |

### Dark mode (`.dark`)

| Variable             | Value       | Usage                              |
|----------------------|-------------|------------------------------------|
| `--background`       | `#0A0A0C`   | Page background (near-black)       |
| `--sidebar-bg`       | `#0D0E14`   | Sidebar (slightly lifted)          |
| `--sidebar-border`   | `rgba(255,255,255,0.05)` | Sidebar right border      |
| `--gold`             | `#C9A96E`   | Primary accent (warmer for dark)   |
| `--gold-light`       | `#E8C99A`   | Bright gold for gradients          |
| `--surface`          | `rgba(255,255,255,0.03)` | Card fill                  |
| `--surface-hover`    | `rgba(255,255,255,0.055)` | Hover state               |
| `--card-border`      | `rgba(255,255,255,0.06)` | Card outlines              |
| `--text-primary`     | `#EDE8E0`   | Warm white for all primary text    |
| `--text-secondary`   | `rgba(237,232,224,0.50)` | Secondary labels          |
| `--text-muted`       | `rgba(237,232,224,0.25)` | Hints, metadata           |

### Semantic accent palette

Use these for status indicators, stat card icons, and badges.
Never use them as background fills beyond 10% opacity.

| Name     | Hex         | Usage                                |
|----------|-------------|--------------------------------------|
| Gold     | `#C9A96E`   | Active states, primary highlights    |
| Sky      | `#60B8D4`   | Occupancy, rooms, info               |
| Green    | `#4ADE80`   | Revenue, confirmed, available        |
| Amber    | `#FBBF24`   | Pending, warnings, full capacity     |
| Violet   | `#A78BFA`   | Duration stats, user avatars         |
| Rose     | `#FB7185`   | Cancelled, errors, destructive       |

Icon background: accent at `0.08` opacity → e.g. `rgba(74,222,128,0.08)`
Badge background: accent at `0.10` opacity

---

## Typography

Two fonts loaded via Google Fonts `@import` in `globals.css`.

### Playfair Display — `var(--font-display)`

Used for: page titles, section headings, stat values, logo wordmark.

```css
font-family: var(--font-display);
```

| Usage             | Size       | Weight | Notes                      |
|-------------------|------------|--------|----------------------------|
| Page title (H1)   | 2.75rem    | 700    | `tracking-tight`           |
| Section heading   | 18px       | 600    | `leading-none`             |
| Stat value        | 1.75rem    | 700    | `tracking-tight`           |
| Live status value | 15px       | 600    | `tabular-nums`             |
| Logo wordmark     | 13px       | 600    | `tracking-tight`           |

### DM Sans — `var(--font-body)`

Used for: navigation labels, body text, badges, metadata, controls.
Applied globally to `body` — no explicit class needed.

| Usage              | Size    | Weight | Notes                         |
|--------------------|---------|--------|-------------------------------|
| Nav labels         | 12.5px  | 500    | `letter-spacing: -0.01em`     |
| Section labels     | 9px     | 600    | `tracking-[0.2em]` uppercase  |
| Status badges      | 10px    | 600    | `tracking-[0.1em]` uppercase  |
| Timestamps         | 11px    | 400    | `tabular-nums`                |
| Body / sub-labels  | 11–13px | 400    | Default                       |
| Controls (locale)  | 9px     | 600    | uppercase                     |

---

## Layout

### Sidebar

The sidebar (`HotelSidebar`) is `position: fixed`, full viewport height.

| State     | Width   | CSS variable          |
|-----------|---------|-----------------------|
| Expanded  | 280px   | `--sidebar-width: 280px` |
| Collapsed | 64px    | `--sidebar-width: 64px`  |

The sidebar sets `--sidebar-width` on `document.documentElement` when toggled.
Main content areas must read from this variable:

```tsx
<main
  style={{
    marginLeft: 'var(--sidebar-width, 280px)',
    transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
  }}
>
```

### Page layout

```
┌──────────────────────────────────────────────────┐
│  Sticky top bar (58px) — date + live indicator   │
├──────────────────────────────────────────────────┤
│  px-8 py-8  max-w-[1380px] mx-auto               │
│                                                  │
│  H1 (Playfair Display 2.75rem)                   │
│  subtitle (11px muted)                           │
│                                                  │
│  Stats grid (2 cols mobile → 4 cols desktop)     │
│                                                  │
│  xl: grid-cols-[1fr_320px]                       │
│  ├── Calendar (flex-1)                           │
│  └── Live Status (320px)                         │
│                                                  │
│  Recent Activity (full width)                    │
└──────────────────────────────────────────────────┘
```

### Cards / panels

Always use CSS variables, never Tailwind color classes directly:

```tsx
<div
  style={{
    background: 'var(--surface)',
    border: '1px solid var(--card-border)',
  }}
  className="rounded-xl p-5"
>
```

Border radius scale:
- Small controls, badges: `rounded-md` (6px)
- Cards, panels: `rounded-xl` (12px)
- Large sections: `rounded-xl` (12px, not `rounded-3xl`)

---

## Component Patterns

### Stat card

```tsx
<div
  style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}
  className="rounded-xl p-5"
  onMouseEnter={(e) => {
    e.currentTarget.style.background = 'var(--surface-hover)';
    e.currentTarget.style.borderColor = accentColor + '30';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = 'var(--surface)';
    e.currentTarget.style.borderColor = 'var(--card-border)';
  }}
>
  {/* Icon */}
  <div className="w-8 h-8 rounded-lg mb-4" style={{ background: accentBg }}>
    <SvgIcon color={accentColor} />
  </div>
  {/* Value */}
  <p style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
     className="text-[1.75rem] font-bold leading-none tracking-tight mb-2">
    {value}
  </p>
  {/* Label */}
  <p style={{ color: 'var(--text-muted)' }}
     className="text-[10px] font-semibold uppercase tracking-[0.14em]">
    {label}
  </p>
</div>
```

### List row (activity feed, live status)

```tsx
<div
  style={{ borderBottom: '1px solid var(--card-border)' }}
  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
  className="flex items-center gap-4 px-5 py-3 transition-colors"
>
```

### Status badge

```tsx
<span
  className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded-md"
  style={{ color: statusColor, background: statusColor + '1A' /* 10% opacity */ }}
>
  {label}
</span>
```

### Section label (sidebar groups, table headers)

```tsx
<span
  className="text-[9px] font-semibold tracking-[0.2em] uppercase"
  style={{ color: 'var(--text-muted)' }}
>
  SECTION NAME
</span>
```

### Icons

All icons are inline SVG with `stroke="currentColor"`, **no fill**, `strokeWidth="1.6"`, `strokeLinecap="round"`, `strokeLinejoin="round"`, viewBox `0 0 24 24`.
Size 14–16px for UI icons, 16px for stat card icons.

```tsx
function Icon({ d, size = 15, color }: { d: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color ?? 'currentColor'}
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
```

Never use Unicode symbols (`◈ ▣ ▤`) for icons — always SVG paths.

### Hover interactions

Always use inline `onMouseEnter`/`onMouseLeave` for hover states that reference CSS variables (Tailwind `hover:` classes can't read CSS variables):

```tsx
onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--gold)')}
onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
```

---

## Sidebar Navigation

### Structure

Nav items are grouped into sections. The sections are:

| Section    | Items                                              |
|------------|----------------------------------------------------|
| Overview   | Dashboard, Reception                               |
| Operations | Calendar, Bookings, Accounts, Wellness, Vouchers   |
| Inventory  | Rooms, Room Types, Rate Codes                      |
| Marketing  | Campaigns, Statistics, Reports                     |
| Guests     | Guests, Tiers                                      |
| Facility   | Parking, Maintenance, Rentals                      |
| System     | Users, Settings                                    |

### Active state anatomy

```
 ┌──────────────────────────────────┐
 │▌ [gold icon] Label         · │  ← gold 2px left bar, gold dot
 └──────────────────────────────────┘
```

- Left bar: `2px` wide, `h-4`, `rounded-r-sm`, `var(--gold)`
- Icon color: `var(--gold)` when active, 70% opacity otherwise
- Background: `var(--surface-hover)` when active
- Label: `var(--text-primary)` when active, `var(--text-secondary)` otherwise

---

## Animations & Motion

Keep animations purposeful and subtle. Use CSS transitions, not JS animation libraries, for standard interactions.

| Interaction         | Transition                                           |
|---------------------|------------------------------------------------------|
| Sidebar collapse    | `width 0.25s cubic-bezier(0.4, 0, 0.2, 1)`          |
| Main content margin | `margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)`    |
| Nav item hover      | `background/color` — no explicit duration (instant)  |
| Card hover          | `background, border-color` — instant                 |
| Live indicator      | `animate-ping` on the pulsing dot                    |
| Alert pulse         | `animate-pulse` on the amber dot in live status      |

Avoid: large scale transforms, bouncing, opacity fade-ins on every render.

---

## Do / Don't

### Do
- Use `var(--text-primary/secondary/muted)` for all text colors
- Use `var(--surface)` and `var(--surface-hover)` for card/panel fills
- Group sidebar nav into labelled sections
- Use Playfair Display for any number, title, or display value
- Use SVG icons with `strokeWidth="1.6"` — never emoji or unicode
- Apply `tabular-nums` to all numeric displays
- Use `border: '1px solid var(--card-border)'` — single-pixel borders only
- Use `rounded-xl` (12px) for cards, `rounded-md` (6px) for controls

### Don't
- Hardcode hex colors in component files
- Use Tailwind color classes (`bg-stone-800`, `text-lime-400`) for the core UI
- Use `border-2` or `border-stone-` classes on new components
- Use `font-black` — prefer `font-bold` (700) or `font-semibold` (600) with display font
- Add box-shadows (`shadow-xl`) — borders + surface fills provide enough depth
- Use `rounded-3xl` — too bubbly for this aesthetic
- Use Inter, Roboto, Arial, or system-ui as primary fonts

---

## File Map

| File | Role |
|------|------|
| `packages/frontend/src/app/globals.css` | CSS variables, font import, scrollbar |
| `packages/frontend/src/components/HotelSidebar.tsx` | Main navigation sidebar |
| `packages/frontend/src/app/hotel-cms/page.tsx` | Dashboard page layout |
| `packages/frontend/src/components/DashboardStats.tsx` | 8-card stat grid |
| `packages/frontend/src/components/HotelLiveStatus.tsx` | Live status list (compact, 320px column) |
| `packages/frontend/src/components/RecentActivity.tsx` | Recent reservations feed |
| `packages/frontend/tailwind.config.ts` | Tailwind config (darkMode: 'class') |

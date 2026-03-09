# Frontend Reception — Design System

Design reference for future iterations. Captures decisions, tokens, and patterns established in v1.

---

## Aesthetic Direction

**Tone:** Clean operational — professional hotel management tool, not a customer-facing product. Clarity over decoration. Staff use this under time pressure so information hierarchy matters above everything.

**Not:** Dark/moody, flashy, consumer-app playful, overly minimal (data density matters here).

**Reference feel:** A well-designed airline operations dashboard or boutique hotel concierge system. White and structured, with color used functionally (status signals), not decoratively.

---

## Typography

| Role         | Font              | Weights    | Usage                              |
|--------------|-------------------|------------|------------------------------------|
| Display      | Playfair Display  | 500–700    | Page headings (`h1`), section titles |
| Body         | DM Sans           | 300–600    | All UI text, labels, paragraphs    |
| Mono         | JetBrains Mono    | 400–500    | IDs, codes, reservation numbers    |

**Type scale:**
- Page title: 22–24px, `font-display`, weight 600, `letter-spacing: -0.02em`
- Section label: 11px, weight 600, `letter-spacing: 0.07–0.09em`, `text-transform: uppercase`, color `--fg-subtle`
- Body text: 13–14px, weight 400–500
- Small/meta: 11–12px, color `--fg-muted` or `--fg-subtle`
- IDs / codes: 12px, `font-mono`, color `--accent`

---

## Color Tokens

Defined as CSS variables in `globals.css`.

### Base palette

```
--bg:             #FFFFFF      Page background
--bg-surface:     #F8F7F4      Card headers, table headers, sidebar
--bg-elevated:    #F0EEE9      Input backgrounds, inner blocks
--bg-hover:       #EEECEA      Row hover state

--fg:             #1C1917      Primary text (warm near-black)
--fg-muted:       #78716C      Secondary text, labels
--fg-subtle:      #A8A29E      Tertiary text, placeholders, section headers

--accent:         #1D3557      Primary accent — deep navy (hotel signage feel)
--accent-light:   #E8EDF5      Accent-tinted background (active sidebar item)
--accent-border:  rgba(29,53,87,0.2)

--border:         rgba(0,0,0,0.07)    Dividers, row separators
--border-strong:  rgba(0,0,0,0.13)   Card outlines, input borders

--sidebar-bg:     #FAFAF8
--sidebar-width:  240px
```

### Status colors

Each status has three tokens: `text color`, `background`, `border`.

| Status  | Color     | Hex      | Usage                        |
|---------|-----------|----------|------------------------------|
| GREEN   | Emerald   | #16A34A  | All checks passed            |
| YELLOW  | Amber     | #CA8A04  | Warning, review recommended  |
| RED     | Rose      | #DC2626  | Issue, action required       |
| PENDING | Indigo    | #4F46E5  | Not yet processed            |
| NONE    | Stone     | #A8A29E  | Not applicable / unconfigured |

**Rule:** Never use status colors for decoration. Only use them to communicate actual system state.

---

## Components

### StatusBadge

Pill with colored dot + label. Two sizes: `md` (default) and `sm`.

- Has background, border, and dot in status color
- `sm` used inside tables for secondary statuses (e.g. Payments column)
- `md` used as the primary status indicator

### Filter Buttons (status filter bar)

**Active state:** Solid fill in status color, white text, matching `box-shadow` glow.
**Inactive state:** White background, colored dot indicator, neutral text.
**Always show:** A small colored dot even when inactive — so users know what they will filter before clicking.
**Count badge:** Shows number of matching reservations. White/transparent when active, neutral surface when inactive.

### Table rows

- Left accent stripe (`inset box-shadow: 3px`) in status color for instant urgency scanning
- Row hover: `--bg-surface` background
- Clickable — full row navigates to detail

### Provider tags

Color-coded per provider (Booking.com navy, Airbnb red, Direct accent, etc.). Background is the hex color at ~7% opacity with a matching border at ~15% opacity.

### Cards (detail quality checks)

2-column grid. Each card background and border is tinted in its status color:
- RED check → red-tinted card
- GREEN check → green-tinted card
- This allows instant scanning without reading the badge label

---

## Layout

```
┌──────────────────────────────────────────────┐
│  Sidebar (240px, sticky)  │  Main content     │
│                           │  (flex-1, scroll) │
│  Logo                     │                   │
│  ─────────────────        │  Page header      │
│  nav sections             │  ─────────────    │
│                           │  Toolbar          │
│                           │  Content          │
│                           │                   │
│  version footer           │                   │
└──────────────────────────────────────────────┘
```

- Sidebar: sticky, `height: 100vh`, no scroll except the nav
- Main: `padding: 36px 40px 60px`, `max-width` varies by page (1000px dashboard, 860px detail)
- Section labels always `11px uppercase` with `border-bottom` separator under the page header

---

## Page Patterns

### List page

1. Page header (title + subtitle + metadata tag, separated by border-bottom)
2. Toolbar: search input | divider | status filter pills
3. Table with: sticky header, left-stripe rows, mono IDs, provider tags, status badges
4. Empty state centered in table body

### Detail page

1. Back link (muted, hover darkens)
2. Page header: mono ID above display-font name, meta row with `·` separators, status badge right-aligned
3. Alert banner (only when issues exist) — tinted in worst status color
4. 2-column info grid: reservation details card + guest note card
5. 2-column quality checks grid: each check is a status-tinted card

### Dashboard page

1. Page header with date
2. 4-column stat cards (total, red, yellow, green)
3. "Needs attention" list — red/yellow reservations, clickable rows
4. Today at-a-glance strip (4 inline metrics)

---

## Spacing

| Token     | Value  | Usage                        |
|-----------|--------|------------------------------|
| page pad  | 40px   | Horizontal page padding      |
| page top  | 36px   | Vertical page padding top    |
| gap-sm    | 8px    | Card grid gap, inline gaps   |
| gap-md    | 14px   | Card row gap                 |
| gap-lg    | 24px   | Section spacing              |
| radius-sm | 6–7px  | Buttons, inputs, tags        |
| radius-md | 9–10px | Cards, tables, panels        |

---

## Future Iteration Ideas

- **Sorting** — click column headers to sort table (currently sorted by status priority)
- **Date range filter** — filter by check-in date range
- **Refresh / live data** — swap mock import for GraphQL query from `reception` service (port 4002)
- **Bulk actions** — select multiple rows, mark as reviewed
- **Export** — CSV export of current filtered view
- **Check detail editing** — allow updating status fields directly from the detail page
- **Toast notifications** — success/error feedback on mutations
- **Pagination / infinite scroll** — for large datasets
- **Keyboard navigation** — `j/k` row navigation, `Enter` to open detail, `Esc` to go back
- **Summary donut chart** — visual GREEN/YELLOW/RED breakdown on dashboard
- **Sidebar collapse** — icon-only mode for smaller screens

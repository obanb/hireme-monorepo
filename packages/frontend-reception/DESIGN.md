# Reception Design System

---

## v2 Proposal — "Night Lobby"

> A redesign direction for the OREA Reception frontend.
> Goal: the most refined, operationally sharp hotel reception interface on the market.

---

### The Problem With "Ordinary"

The current design is clean and functional — which is exactly the problem. It looks like every other SaaS dashboard: white background, navy accent, Playfair heading over a table. A visitor couldn't distinguish it from a CRM, a project tracker, or an HR tool.

Hotel reception software has been stuck in two failure modes:

- **Legacy ugliness** — Opera PMS, Mews, Cloudbeds. Dense, clinical, grey. Designed in the early 2000s and never revisited. Receptionists hate using it.
- **Modern generic** — The wave of "beautiful" hotel tech that replaced the above with white cards, rounded corners, and Inter. Better, but anonymous. Could be anything.

Neither feels like it belongs in a *luxury hotel*.

---

### The Concept

**Time:** 23:15. The lobby is nearly empty.
**Light:** Warm amber from brass wall sconces. Dark marble surfaces. The soft glow of the front desk lamp.
**The receptionist** is handling a late check-in. Their screen should feel like part of this environment — not a jarring white rectangle blasting light into a dim lobby, but something that belongs here.

Night Lobby is a **warm dark** design system. Not cold tech-dark (developer tools, gaming). Not dramatic neon-dark. Warm. Amber-tinted. Like the screen was made for this specific room.

**The one thing you will remember:** colored status indicators that glow like small lights against the dark canvas. A RED reservation doesn't just say "problem" — it *feels* urgent. GREEN genuinely radiates "all clear." On white backgrounds, status colors are labels. On dark, they are signals.

---

### Why Dark for Reception?

This is not aesthetic preference. There are operational reasons.

| Concern | Current (Light) | Night Lobby (Dark) |
|---|---|---|
| Long-shift eye strain | Fatiguing after 4–6 hours | Comfortable all shift |
| Status urgency reading | RED badge on white — visible | RED glow on dark — *felt* |
| Guest-facing moments | Screen looks like any browser | Screen looks like a serious tool |
| VIP tier recognition | Gold badge competes with white bg | Gold shines against near-black |
| Night shift ambiance | Screen fights the room | Screen fits the room |
| Information density | White needs space to breathe | Dark tolerates tighter density |

---

### Typography

#### Display — `Cormorant Garamond` (replaces Playfair Display)

Both are serifs, but Cormorant is:

- **More condensed** — saves horizontal space at the same visual weight
- **More refined** — closer to luxury hotel signage (Four Seasons, Aman, Mandarin Oriental)
- **Better on dark** — Playfair's thick-thin contrast muddies on dark backgrounds; Cormorant's extreme contrast stays crisp

Usage: page headings, section titles, stat numbers, sidebar logo.

```css
font-family: 'Cormorant Garamond', serif;
/* headings: weight 600 */
/* stat numbers: weight 500 */
```

#### Body — `IBM Plex Sans` (replaces DM Sans)

The shift is subtle but meaningful:

- **Narrower** — more text fits per line at the same size
- **More purposeful character** — fits an operational command-center tool
- **Same family as mono** — IBM Plex Mono creates true visual harmony; no more mixing typeface families
- **Holds form at 12px** — DM Sans softens; Plex stays crisp at small sizes

```css
font-family: 'IBM Plex Sans', sans-serif;
/* body: weight 400 */
/* labels, active states: weight 500 */
```

#### Mono — `IBM Plex Mono` (replaces JetBrains Mono)

From the same family as the body font. Booking IDs, room numbers, and rate codes now feel deliberately paired — not inserted from a different type system.

```css
font-family: 'IBM Plex Mono', monospace;
/* IDs, codes: weight 400 */
/* room numbers (prominent): weight 600 */
```

#### Font import

```css
@import url('https://fonts.googleapis.com/css2?
  family=Cormorant+Garamond:wght@500;600;700
  &family=IBM+Plex+Sans:wght@300;400;500;600
  &family=IBM+Plex+Mono:wght@400;500;600
  &display=swap');
```

---

### Color System

#### Canvas Layers

These are not pure blacks. Each carries a warm undertone (yellow-brown cast) that prevents the "dead screen" look and ties every layer back to the amber accent.

```css
--bg:          #0C0C0A;   /* warm near-black — the canvas */
--bg-surface:  #141411;   /* cards, table rows */
--bg-elevated: #1C1C18;   /* dropdowns, popovers, hover */
--bg-hover:    #232320;   /* active hover state */
```

#### Foreground

Pure white on dark creates harsh contrast that fatigues over long shifts. Warm ivory reads as "white" but is measurably more comfortable.

```css
--fg:          #F2E8D5;   /* warm ivory — primary text */
--fg-muted:    #9A9287;   /* secondary text, labels */
--fg-subtle:   #5C5650;   /* placeholders, section headers, disabled */
```

#### Accent — Brass

Why brass instead of the current navy (`#1D3557`)?

1. Navy disappears on a dark background — it has no luminosity.
2. Brass is the signature material of luxury hotel spaces: fixtures, desk nameplates, elevator buttons, door handles. It is *contextually correct*.
3. Gold on near-black is the combination of premium: Amex Black, Rolex, hotel letterhead, five-star signage.

```css
--accent:        #C9A84C;                /* brass primary */
--accent-hover:  #DFB95E;                /* lighter on hover */
--accent-light:  rgba(201,168,76,0.12);  /* tinted backgrounds */
--accent-border: rgba(201,168,76,0.28);  /* focus rings, selected rows */
```

**One rule about brass text:** Dark text on brass buttons, not white. `color: #0C0C0A` on `background: #C9A84C`. More legible, more refined.

#### Borders

Warm-tinted borders instead of black-alpha. They feel like part of the palette rather than structural scaffolding bolted on.

```css
--border:        rgba(242,232,213,0.07);   /* row separators, subtle structure */
--border-strong: rgba(242,232,213,0.14);   /* card outlines, table headers */
--border-accent: rgba(201,168,76,0.30);    /* selected states, focus */
```

#### Sidebar

```css
--sidebar-bg:    #0A0A08;   /* one step darker than canvas */
--sidebar-width: 200px;     /* down from 240px — saves 40px of real estate */
```

#### Status Colors — Luminous

This is the most important change in the entire system.

On a white background, status colors must be *muted* to avoid clashing with the surrounding brightness. `#DC2626` on white is acceptable. `#FF5555` on white is aggressive. But `#FF5555` on near-black is *readable, urgent, and beautiful.*

On dark, we can use real colors.

```css
/* Primary status colors — used for text, dots, and borders */
--status-green:   #3DD68C;
--status-yellow:  #FFC044;
--status-red:     #FF5555;
--status-pending: #818CF8;
--status-none:    #5C5650;

/* Tinted backgrounds — deep but not flat */
--status-green-bg:   rgba(61,214,140,0.10);
--status-yellow-bg:  rgba(255,192,68,0.10);
--status-red-bg:     rgba(255,85,85,0.10);
--status-pending-bg: rgba(129,140,248,0.10);
--status-none-bg:    rgba(92,86,80,0.15);

/* Borders */
--status-green-border:   rgba(61,214,140,0.25);
--status-yellow-border:  rgba(255,192,68,0.25);
--status-red-border:     rgba(255,85,85,0.25);
--status-pending-border: rgba(129,140,248,0.25);
--status-none-border:    rgba(92,86,80,0.20);
```

---

### The RED Glow — One Special Effect

The only decorative effect in the entire system. Applied only to RED status indicators.

```css
@keyframes urgentPulse {
  0%, 100% { box-shadow: 0 0 0 2px rgba(255,85,85,0.25); }
  50%       { box-shadow: 0 0 0 5px rgba(255,85,85,0.08); }
}

.status-dot-red {
  animation: urgentPulse 2.8s ease-in-out infinite;
}
```

This serves a real purpose: a receptionist glancing away from the screen for a moment will catch the pulse in peripheral vision. No other animation in the system does this. The moment you add it to YELLOW, it loses all meaning.

---

### Density

Dark themes tolerate tighter spacing because borders and background contrast distinguish elements more sharply than on white. Whitespace was doing organizational work — on dark, contrast does it instead.

| Element | Current | Night Lobby | Delta |
|---|---|---|---|
| Sidebar width | 240px | 200px | −40px |
| Base font size | 14px | 13px | −1px |
| Table row height | ~52px | ~40px | −23% |
| Page padding | 28–40px | 20–28px | ~−30% |
| Section gap | 32–36px | 20–24px | ~−33% |

Target: **25–30% more information visible without scrolling**, with no increase in cognitive load.

---

### Component Patterns

#### Sidebar

```
  ●  Reception              ← brass dot + Cormorant wordmark, 15px
  ─────────────────────
  OVERVIEW
    Dashboard
  OPERATIONS
    Reservation Checks
    Arriving Guests          ← active: 2px brass left border + brass text
```

- Active: `2px left border var(--accent)` + `color: var(--accent)` + `var(--accent-light)` background
- Inactive: `var(--fg-subtle)`, transparent
- Section labels: 9px, uppercase, `0.1em` tracking, `var(--fg-subtle)`
- Footer: current shift time + receptionist name, not version string

#### Tables

- **Header row:** `var(--bg-elevated)`, 10px uppercase labels, `var(--fg-subtle)`
- **Data rows:** `var(--bg)` base, `var(--bg-surface)` on hover
- **Selected row (split panel):** `2px left border var(--accent-border)` + `var(--accent-light)` bg
- **No-room urgency:** `2px left border var(--status-yellow)` + `var(--status-yellow-bg)` bg
- **Row left accent stripe:** status color, 2px inset — same as current, just more visible on dark

#### Status Badges

```
●  RED       ← 7px glowing dot + label, IBM Plex Sans 11px
●  YELLOW
●  GREEN
●  PENDING
```

`sm` size: dot only (8px), used inline in tables.
`md` size: dot + label.
No filled pill background needed on dark — the dot alone is sufficient at this contrast level.

#### Stat Cards

```
┌──────────────────────────┐
│  24                      │  ← Cormorant 32px, var(--fg)
│  Total Reservations      │  ← IBM Plex Sans 11px, var(--fg-subtle)
│  under review            │  ← 11px, var(--fg-subtle)
└──────────────────────────┘
  border: var(--border-strong)
  background: var(--bg-surface)
```

No icons in stat cards. Numbers at 32px in Cormorant are the visual anchor — icons compete with them unnecessarily.

#### Buttons

Primary (call to action):
```css
background: var(--accent);       /* brass */
color: #0C0C0A;                  /* dark text on gold */
font-weight: 600;
border: none;
```

Secondary / ghost:
```css
background: transparent;
border: 1px solid var(--border-strong);
color: var(--fg-muted);
```

Destructive (never used as primary):
```css
background: var(--status-red-bg);
border: 1px solid var(--status-red-border);
color: var(--status-red);
```

#### Gantt Calendar Bars

| Tier | Background | Border | Text color |
|---|---|---|---|
| Newcomer | `rgba(242,232,213,0.08)` | `rgba(242,232,213,0.18)` | `var(--fg-muted)` |
| Silver | `rgba(99,179,237,0.12)` | `rgba(99,179,237,0.28)` | `#63B3ED` |
| Gold | `rgba(201,168,76,0.15)` | `rgba(201,168,76,0.32)` | `var(--accent)` |
| Platinum | `rgba(167,139,250,0.15)` | `rgba(167,139,250,0.32)` | `#A78BFA` |
| No room | diagonal amber stripes | dashed `var(--status-yellow-border)` | `var(--status-yellow)` |

#### VIP / Platinum

The only gradient in the system — reserved for Platinum guest moments:

```css
.vip-badge {
  background: linear-gradient(135deg, #C9A84C 0%, #E8C96B 100%);
  color: #0C0C0A;
}
```

When Platinum guests appear in the system, they earn this treatment. Nothing else gets a gradient.

---

### Motion

Keep the existing `fadeUp` entry animation — it's right.

Add one new behavior only:

```css
@keyframes urgentPulse {
  0%, 100% { box-shadow: 0 0 0 2px rgba(255,85,85,0.25); }
  50%       { box-shadow: 0 0 0 5px rgba(255,85,85,0.08); }
}
.status-dot-red { animation: urgentPulse 2.8s ease-in-out infinite; }
```

Nothing else. Every animation added beyond these two dilutes the impact of both. Restraint is a design decision.

---

### What Changes vs. What Stays

#### Changes

- Theme: light → warm dark
- Fonts: Playfair + DM Sans + JetBrains → Cormorant + IBM Plex Sans + IBM Plex Mono
- Accent: navy `#1D3557` → brass `#C9A84C`
- Status colors: muted for white → luminous for dark
- Sidebar: 240px → 200px
- Density: ~25–30% tighter throughout
- Primary button: dark text on brass (not white)

#### Stays

- Layout structure: sidebar + content + split panel + calendar
- CSS variable names (values change, names don't)
- Information architecture: no features moved or removed
- Component prop APIs
- All functionality: 100% parity

This is a theme swap, not a rebuild. Primary work is in `globals.css` + hunting down the ~30 hardcoded hex values scattered across components.

---

### Hardcoded Colors to Replace

The following patterns exist in component files and need to become CSS variables:

| Find | Replace with |
|---|---|
| `#fff` / `#ffffff` | `var(--bg-surface)` |
| `background: '#fff'` | `var(--bg-surface)` |
| `rgba(0,0,0,0.07)` | `var(--border)` |
| `rgba(0,0,0,0.13)` | `var(--border-strong)` |
| `#1D3557` | `var(--accent)` |
| `#003B95` (Booking.com) | `#4A90D9` (readable on dark) |
| `#FFB900` (Expedia) | `#FFB900` (already works on dark) |
| `#059669` (green states) | `var(--status-green)` |
| `#DC2626` (red states) | `var(--status-red)` |
| `#CA8A04` (yellow states) | `var(--status-yellow)` |

---

### Full CSS Variable Diff

```css
/* CURRENT → NIGHT LOBBY */

/* Fonts */
--font-display: 'Playfair Display'    → 'Cormorant Garamond'
--font-body:    'DM Sans'             → 'IBM Plex Sans'
--font-mono:    'JetBrains Mono'      → 'IBM Plex Mono'

/* Backgrounds */
--bg:           #FFFFFF   →  #0C0C0A
--bg-surface:   #F8F7F4   →  #141411
--bg-elevated:  #F0EEE9   →  #1C1C18
--bg-hover:     #EEECEA   →  #232320

/* Foreground */
--fg:           #1C1917   →  #F2E8D5
--fg-muted:     #78716C   →  #9A9287
--fg-subtle:    #A8A29E   →  #5C5650

/* Accent */
--accent:       #1D3557   →  #C9A84C
--accent-light: #E8EDF5   →  rgba(201,168,76,0.12)
--accent-border: rgba(29,53,87,0.2)  →  rgba(201,168,76,0.28)

/* Sidebar */
--sidebar-bg:   #FAFAF8   →  #0A0A08
--sidebar-width: 240px    →  200px

/* Borders */
--border:       rgba(0,0,0,0.07)   →  rgba(242,232,213,0.07)
--border-strong: rgba(0,0,0,0.13)  →  rgba(242,232,213,0.14)

/* Status */
--status-green:          #16A34A  →  #3DD68C
--status-green-bg:       #F0FDF4  →  rgba(61,214,140,0.10)
--status-green-border:   #BBF7D0  →  rgba(61,214,140,0.25)
--status-yellow:         #CA8A04  →  #FFC044
--status-yellow-bg:      #FEFCE8  →  rgba(255,192,68,0.10)
--status-yellow-border:  #FDE68A  →  rgba(255,192,68,0.25)
--status-red:            #DC2626  →  #FF5555
--status-red-bg:         #FEF2F2  →  rgba(255,85,85,0.10)
--status-red-border:     #FECACA  →  rgba(255,85,85,0.25)
--status-pending:        #4F46E5  →  #818CF8
--status-pending-bg:     #EEF2FF  →  rgba(129,140,248,0.10)
--status-pending-border: #C7D2FE  →  rgba(129,140,248,0.25)
--status-none:           #A8A29E  →  #5C5650
--status-none-bg:        #F5F5F4  →  rgba(92,86,80,0.15)
--status-none-border:    #E7E5E4  →  rgba(92,86,80,0.20)
```

---

### Summary

Night Lobby solves "ordinary" without sacrificing clarity or usability. Every decision is grounded in the operational reality of hotel reception:

- Long shifts → dark reduces fatigue
- Status urgency matters → luminous indicators are faster to read than muted ones
- The tool should reflect its environment → warm amber belongs in a hotel lobby
- VIP guests deserve visible priority → gold on dark is unambiguous
- More information per screen → tighter density without losing legibility

The result is a tool that feels purpose-built for luxury hospitality — not adapted from a generic SaaS template. No other hotel PMS or reception tool looks like this. That gap is the opportunity.

---

---

## v1 Reference — Current Design System

*Preserved below for reference during transition.*

---

### Aesthetic Direction

**Tone:** Clean operational — professional hotel management tool, not a customer-facing product. Clarity over decoration. Staff use this under time pressure so information hierarchy matters above everything.

**Typography:**

| Role | Font | Weights | Usage |
|---|---|---|---|
| Display | Playfair Display | 500–700 | Page headings, section titles |
| Body | DM Sans | 300–600 | All UI text, labels |
| Mono | JetBrains Mono | 400–500 | IDs, codes, reservation numbers |

**Color tokens:**

```
--bg:             #FFFFFF
--bg-surface:     #F8F7F4
--bg-elevated:    #F0EEE9
--fg:             #1C1917
--fg-muted:       #78716C
--fg-subtle:      #A8A29E
--accent:         #1D3557
--sidebar-width:  240px
```

**Status colors:**

| Status | Color | Hex |
|---|---|---|
| GREEN | Emerald | #16A34A |
| YELLOW | Amber | #CA8A04 |
| RED | Rose | #DC2626 |
| PENDING | Indigo | #4F46E5 |
| NONE | Stone | #A8A29E |

**Layout:** Sidebar (240px sticky) + main content. Page padding: `36px 40px`.

**Component patterns:** Left-stripe status rows, provider color tags, status pill badges, split-panel detail, Gantt calendar with hotel groups.

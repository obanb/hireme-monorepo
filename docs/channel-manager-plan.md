# Channel Manager — Feature Plan

## What it does
Connects hotel rooms/rates/availability to OTAs (Booking.com, Expedia, Airbnb, etc.) from a single dashboard. Two-way sync: push availability out, pull reservations in.

## Page Sections

### 1. Connected Channels — top cards grid (`grid-cols-4`)
Each card = one OTA connection:
- Logo/icon + name (Booking.com, Expedia, Airbnb, HotelBeds...)
- Status badge: `Connected` (green), `Disconnected` (red), `Syncing` (amber pulse)
- Last sync timestamp
- Room count mapped
- "Configure" / "Connect" button
- Toggle to enable/disable channel without deleting

### 2. Channel Mapping Table — the core
Matrix view: **rows = your rooms**, **columns = channels**

| Room | Type | Booking.com | Expedia | Airbnb |
|------|------|-------------|---------|--------|
| 101 | Double | Mapped (ext: 8834) | Mapped | Not mapped |
| 102 | Suite | Mapped (ext: 9921) | — | Mapped |

Each cell shows: mapped/unmapped, external room ID, rate override if any. Click cell to map/unmap or edit the mapping.

### 3. Rate & Availability Push — bulk controls
- Date range picker (from → to)
- Channel multi-select checkboxes
- Room type filter
- Table showing: Date | Room Type | Base Rate | Booking.com Rate | Expedia Rate | Availability Count
- Inline editable cells for per-channel rate overrides (e.g. +15% markup on Expedia)
- "Push Rates" button → sends to selected channels
- "Close Availability" / "Open Availability" bulk actions

### 4. Reservation Inbox — pulled bookings
- List of reservations received from OTAs, not yet confirmed internally
- Each row: Channel icon | Guest name | Dates | Room type requested | Amount | "Accept" / "Reject" buttons
- Accepted = creates a Reservation in the event-sourced system (reuses `createReservation` mutation with `originId` = OTA booking ref)
- Filter by channel, date, status (new/accepted/rejected)

### 5. Sync Log — collapsible bottom panel
- Chronological feed: `[2026-02-11 14:32] Booking.com — Pushed availability for 12 rooms` / `[14:30] Expedia — Pulled 2 new reservations`
- Status icons: success/warning/error
- "Force Sync" button per channel

## Data Model (new GraphQL types)

```graphql
enum ChannelType { BOOKING_COM  EXPEDIA  AIRBNB  HOTELBEDS  MANUAL }
enum ChannelStatus { CONNECTED  DISCONNECTED  ERROR }
enum SyncDirection { PUSH  PULL }

type Channel {
  id: ID!
  type: ChannelType!
  name: String!
  status: ChannelStatus!
  apiKeyConfigured: Boolean!
  lastSyncAt: String
  mappedRoomCount: Int!
  enabled: Boolean!
}

type ChannelMapping {
  id: ID!
  channelId: ID!
  roomId: ID!
  externalRoomId: String!
  rateMultiplier: Float      # e.g. 1.15 = +15%
  rateOverride: Float        # absolute override
  enabled: Boolean!
}

type SyncLogEntry {
  id: ID!
  channelId: ID!
  direction: SyncDirection!
  status: String!
  message: String!
  itemCount: Int!
  occurredAt: String!
}

type ChannelReservation {
  id: ID!
  channelId: ID!
  externalBookingId: String!
  guestName: String!
  guestEmail: String
  checkInDate: String!
  checkOutDate: String!
  roomTypeRequested: String
  amount: Float!
  currency: String!
  status: String!            # NEW / ACCEPTED / REJECTED
  pulledAt: String!
}
```

## How it fits the existing architecture

- **Backend subgraph** gets new resolvers for channels, mappings, sync logs
- **Event sourcing** — channel connections and mapping changes emit events (`ChannelConnected`, `RatePushed`, `OtaReservationReceived`)
- `originId` on `Reservation` already exists — OTA bookings flow through `createReservation` with `originId` set to the external booking ref
- Actual OTA API integration would live in a separate `packages/channel-manager` service (or start as mock/manual for MVP)

## MVP vs Full

### MVP (no real OTA APIs)
- Manual channel entries (name, type, status toggle)
- Room-to-channel mapping table
- Manual "import reservation" from channel (form pre-filled with channel context)
- Rate sheet export per channel (reuses xlsx Reports page)

### Full
- Real API connectors (Booking.com, Expedia have partner APIs)
- Background sync worker (cron or RabbitMQ scheduled)
- Webhook receivers for instant reservation pull
- Automatic availability closure when room is booked on any channel

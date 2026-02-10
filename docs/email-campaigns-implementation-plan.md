# Email Campaigns — Implementation Plan

## Context

The Hotel CMS needs a lite email campaign administration system. Staff should be able to create HTML email templates, define smart targeting rules based on reservation data (e.g. "guests departing after date X"), send campaigns, and track basic stats (sent, opened, clicked). Emails are sent via Resend (already integrated for auth emails).

**Decisions**: Plain PostgreSQL tables (same pattern as auth module — no event sourcing). Resend for delivery. Open/click tracking via pixel + redirect. Templates stored as HTML in the database. No drag-and-drop builder — provide 3-4 pre-built base templates the user can edit.

## Problem: Missing Guest Email

The current `reservations` table only has `guest_name` (text) — no email address. Campaigns need somewhere to send emails. Two options:

**Option A (recommended)**: Add `guest_email` column to the existing `reservations` table. Minimal change, immediately queryable for targeting.

**Option B**: Create a separate `guests` table and link reservations to it. More normalized but heavier — deferred to Phase 2.

This plan uses Option A — a single `ALTER TABLE` migration adding `guest_email VARCHAR(255)` to reservations, plus updating the `CreateReservation` input and MCP tool to accept it.

## New Dependencies

**Backend** (`packages/backend/package.json`):
- None — `resend` and `uuid` are already installed.

## Database Tables (4 new + 1 altered)

```sql
-- Alter existing reservations table
ALTER TABLE reservations ADD COLUMN guest_email VARCHAR(255);
CREATE INDEX idx_reservations_guest_email ON reservations(guest_email);

-- Email templates
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_body TEXT NOT NULL,
  preview_text VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  template_id UUID NOT NULL REFERENCES email_templates(id),
  targeting_rules JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',  -- DRAFT | SCHEDULED | SENDING | SENT | FAILED
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INT NOT NULL DEFAULT 0,
  total_sent INT NOT NULL DEFAULT 0,
  total_failed INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign send log (one row per recipient)
CREATE TABLE campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  reservation_id UUID REFERENCES reservations(id),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | SENT | FAILED | BOUNCED
  resend_message_id VARCHAR(255),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_sends_campaign ON campaign_sends(campaign_id);
CREATE INDEX idx_campaign_sends_status ON campaign_sends(status);

-- Tracking events (opens, clicks)
CREATE TABLE campaign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id UUID NOT NULL REFERENCES campaign_sends(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL,  -- OPEN | CLICK
  metadata JSONB,  -- { url: "..." } for clicks
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_events_send ON campaign_events(send_id);
```

## Targeting Rules Schema

Stored as JSONB in `campaigns.targeting_rules`:

```typescript
interface TargetingRules {
  // Reservation date filters
  checkInFrom?: string;   // ISO date
  checkInTo?: string;
  checkOutFrom?: string;  // "everybody departing after date X"
  checkOutTo?: string;
  createdFrom?: string;
  createdTo?: string;

  // Reservation status filter
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED';

  // Amount filters
  minAmount?: number;
  maxAmount?: number;
  currency?: string;

  // De-duplication
  deduplicateByEmail?: boolean;  // default true — one email per unique guest_email
}
```

The targeting query builds a `SELECT DISTINCT guest_email, guest_name FROM reservations WHERE ...` based on these rules. Only rows where `guest_email IS NOT NULL` are included.

## GraphQL Schema

```graphql
# packages/shared-schema/schema/campaign.graphql

type EmailTemplate {
  id: ID!
  name: String!
  subject: String!
  htmlBody: String!
  previewText: String
  isActive: Boolean!
  createdAt: String!
  updatedAt: String!
}

type Campaign {
  id: ID!
  name: String!
  template: EmailTemplate!
  targetingRules: String!       # JSON string
  status: String!
  scheduledAt: String
  sentAt: String
  totalRecipients: Int!
  totalSent: Int!
  totalFailed: Int!
  createdAt: String!
  updatedAt: String!
}

type CampaignSend {
  id: ID!
  recipientEmail: String!
  recipientName: String
  status: String!
  openedAt: String
  clickedAt: String
  sentAt: String
}

type CampaignStats {
  totalRecipients: Int!
  totalSent: Int!
  totalFailed: Int!
  totalOpened: Int!
  totalClicked: Int!
  openRate: Float!
  clickRate: Float!
}

type TargetAudiencePreview {
  count: Int!
  sampleRecipients: [TargetRecipient!]!
}

type TargetRecipient {
  email: String!
  name: String
}

input CreateEmailTemplateInput {
  name: String!
  subject: String!
  htmlBody: String!
  previewText: String
}

input UpdateEmailTemplateInput {
  name: String
  subject: String
  htmlBody: String
  previewText: String
  isActive: Boolean
}

input CreateCampaignInput {
  name: String!
  templateId: ID!
  targetingRules: String!       # JSON string
  scheduledAt: String
}

input UpdateCampaignInput {
  name: String
  templateId: ID
  targetingRules: String
  scheduledAt: String
}

extend type Query {
  emailTemplates(includeInactive: Boolean): [EmailTemplate!]!
  emailTemplate(id: ID!): EmailTemplate
  campaigns: [Campaign!]!
  campaign(id: ID!): Campaign
  campaignStats(campaignId: ID!): CampaignStats!
  campaignSends(campaignId: ID!, limit: Int, offset: Int): [CampaignSend!]!
  previewTargetAudience(targetingRules: String!): TargetAudiencePreview!
}

extend type Mutation {
  createEmailTemplate(input: CreateEmailTemplateInput!): EmailTemplate!
  updateEmailTemplate(id: ID!, input: UpdateEmailTemplateInput!): EmailTemplate!
  deleteEmailTemplate(id: ID!): Boolean!
  createCampaign(input: CreateCampaignInput!): Campaign!
  updateCampaign(id: ID!, input: UpdateCampaignInput!): Campaign!
  deleteCampaign(id: ID!): Boolean!
  sendCampaign(id: ID!): Campaign!
  sendTestEmail(templateId: ID!, recipientEmail: String!): Boolean!
}
```

## Files to Create (10)

### Backend Campaign Module (`packages/backend/src/campaigns/`)

| # | File | Purpose |
|---|------|---------|
| 1 | `config.ts` | Campaign config: from address, batch size, tracking URL base |
| 2 | `database.ts` | `initializeCampaignTables()` — creates 4 tables + alters reservations |
| 3 | `template-repository.ts` | CRUD for `email_templates`: create, findById, update, delete, listAll |
| 4 | `campaign-repository.ts` | CRUD for `campaigns`: create, findById, update, delete, listAll, updateStats |
| 5 | `send-repository.ts` | CRUD for `campaign_sends` + `campaign_events`: create batch, update status, record events, get stats |
| 6 | `targeting.ts` | `buildTargetQuery(rules)` → builds SQL WHERE clause. `getTargetAudience(rules)` → returns `{email, name}[]`. `previewAudience(rules)` → returns count + 10 sample rows |
| 7 | `sender.ts` | `executeCampaign(campaignId)` — loads campaign + template, gets audience, renders HTML with variables ({{guest_name}}), sends via Resend in batches, records send log, updates campaign stats |
| 8 | `tracking.ts` | Express routes: `GET /track/open/:sendId` returns 1x1 transparent pixel + records OPEN event. `GET /track/click/:sendId` reads `url` query param, records CLICK event, redirects to destination URL |
| 9 | `seed-templates.ts` | `seedDefaultTemplates()` — inserts 3 base HTML templates if none exist: Welcome, Post-Stay Feedback, Special Offer |
| 10 | `index.ts` | Barrel export |

### Shared Schema

| # | File | Purpose |
|---|------|---------|
| 11 | `packages/shared-schema/schema/campaign.graphql` | Full schema as shown above |

### Frontend

| # | File | Purpose |
|---|------|---------|
| 12 | `packages/frontend/src/app/hotel-cms/campaigns/page.tsx` | Main campaigns page — list campaigns with status badges, stats summary, create/edit modal, send button with confirmation, audience preview |
| 13 | `packages/frontend/src/app/hotel-cms/campaigns/templates/page.tsx` | Template management — list templates, edit with HTML textarea + live preview iframe, create from base templates |

## Files to Modify (7)

| # | File | Change |
|---|------|--------|
| 1 | `packages/shared-schema/src/index.ts` | Add `getCampaignSchema()` + include in `getCombinedSchema()` |
| 2 | `packages/backend/src/index.ts` | Import campaign module, call `initializeCampaignTables()` + `seedDefaultTemplates()` at startup, add all campaign resolvers, mount tracking routes on express app |
| 3 | `packages/backend/src/auth/email-service.ts` | Extract shared `getResend()` into a common module OR duplicate (simpler — campaigns module gets its own Resend client) |
| 4 | `packages/frontend/src/components/HotelSidebar.tsx` | Add "Campaigns" menu item with roles: ['ADMIN', 'USER'] |
| 5 | `packages/shared-schema/schema/reservation.graphql` | Add `guestEmail: String` field to Reservation type |
| 6 | `packages/backend/src/index.ts` (CreateReservation) | Accept `guestEmail` in input, pass to repository |
| 7 | `packages/mcp/src/server.ts` | Add `guestEmail` param to `create_reservation` tool |

## Implementation Order

### Stage A: Schema + Backend Module

1. Create `packages/shared-schema/schema/campaign.graphql`
2. Modify `packages/shared-schema/src/index.ts` — add `getCampaignSchema()`
3. Add `guestEmail` to reservation schema + rebuild shared-schema
4. Create all files in `packages/backend/src/campaigns/` (config → database → template-repository → campaign-repository → send-repository → targeting → sender → tracking → seed-templates → index)
5. Modify `packages/backend/src/index.ts` — integrate campaign module (imports, init, resolvers, tracking routes)
6. Update existing reservation create resolver + MCP tool to accept `guestEmail`
7. Build backend: verify clean compilation

### Stage B: Frontend

8. Add "Campaigns" to sidebar menu
9. Create campaigns list page (`/hotel-cms/campaigns`)
10. Create templates management page (`/hotel-cms/campaigns/templates`)
11. Build frontend: verify clean compilation

## Key Design Details

### Template Variables

Templates support simple `{{variable}}` interpolation. Available variables:

| Variable | Source |
|----------|--------|
| `{{guest_name}}` | reservation.guest_name |
| `{{guest_email}}` | reservation.guest_email |
| `{{check_in_date}}` | reservation.check_in_date |
| `{{check_out_date}}` | reservation.check_out_date |
| `{{hotel_name}}` | hardcoded or config |
| `{{unsubscribe_url}}` | tracking link (future) |

Rendering:
```typescript
function renderTemplate(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}
```

### Campaign Sending Flow

```
User clicks "Send Campaign"
        │
        ▼
  Set campaign status → SENDING
        │
        ▼
  Query target audience (targeting.ts)
  → SELECT DISTINCT guest_email, guest_name FROM reservations WHERE ...
        │
        ▼
  Insert campaign_sends rows (status: PENDING)
  Update campaign.total_recipients
        │
        ▼
  For each recipient (batched, 10 at a time):
    1. Render template with guest variables
    2. Inject tracking pixel: <img src="/track/open/{sendId}">
    3. Rewrite links: href → /track/click/{sendId}?url=original
    4. Send via Resend SDK
    5. Update campaign_sends.status → SENT | FAILED
    6. Update campaign.total_sent / total_failed
        │
        ▼
  Set campaign status → SENT, record sent_at
```

### Tracking Routes

Mounted directly on Express (not through GraphQL):

```typescript
// GET /track/open/:sendId — open tracking pixel
app.get('/track/open/:sendId', async (req, res) => {
  recordEvent(req.params.sendId, 'OPEN');
  // Return 1x1 transparent GIF
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-store');
  res.send(pixel);
});

// GET /track/click/:sendId — click tracking redirect
app.get('/track/click/:sendId', async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).send('Missing url');
  recordEvent(req.params.sendId, 'CLICK', { url });
  res.redirect(url);
});
```

### Seed Templates

Three base templates seeded on first startup:

1. **Welcome** — "Welcome to [Hotel], {{guest_name}}! Your reservation is confirmed for {{check_in_date}}." Clean, single-column layout with header image placeholder and CTA button.

2. **Post-Stay Feedback** — "How was your stay, {{guest_name}}? We'd love to hear about your experience." Star rating visual + link to feedback form.

3. **Special Offer** — "Exclusive offer for you, {{guest_name}}!" Two-column layout with offer image, discount badge, and booking CTA button.

All templates use inline CSS for email client compatibility. Responsive single-column layout, max-width 600px.

### Stats Calculation

```sql
-- campaignStats query
SELECT
  c.total_recipients,
  c.total_sent,
  c.total_failed,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.opened_at IS NOT NULL) as total_opened,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.clicked_at IS NOT NULL) as total_clicked
FROM campaigns c
LEFT JOIN campaign_sends cs ON cs.campaign_id = c.id
WHERE c.id = $1
GROUP BY c.id;

-- open_rate = total_opened / total_sent
-- click_rate = total_clicked / total_sent
```

### Auth Guards

All campaign mutations require `requireAuth(context)`. Template and campaign deletion require `requireRole(context, 'ADMIN')`.

### Frontend: Campaigns Page Layout

```
┌─────────────────────────────────────────────────────┐
│  Email Campaigns                    [+ New Campaign] │
├─────────────────────────────────────────────────────┤
│  Filter: [All] [Draft] [Sent] [Scheduled]           │
├─────────────────────────────────────────────────────┤
│  ┌─────────┬──────────┬────────┬──────┬──────────┐  │
│  │ Name    │ Template │ Status │ Sent │ Actions  │  │
│  ├─────────┼──────────┼────────┼──────┼──────────┤  │
│  │ Welcome │ Welcome  │ ●SENT  │ 142  │ Stats ▶  │  │
│  │ Promo   │ Offer    │ ○DRAFT │ -    │ Edit ✎  │  │
│  │ Re-book │ Post-Stay│ ◉SCHED │ -    │ Edit ✎  │  │
│  └─────────┴──────────┴────────┴──────┴──────────┘  │
└─────────────────────────────────────────────────────┘
```

Create/Edit modal includes:
- Name input
- Template selector (dropdown)
- Targeting rules builder (date pickers, status dropdown, amount range)
- "Preview Audience" button → shows count + sample emails
- Schedule date picker (optional)
- "Send Now" / "Save Draft" buttons

### Frontend: Templates Page Layout

```
┌─────────────────────────────────────────────────────┐
│  Email Templates                   [+ New Template]  │
├─────────────────────────────────────────────────────┤
│  ┌──────────────┬────────────────────┬────────────┐ │
│  │ Template     │ Subject            │ Actions    │ │
│  ├──────────────┼────────────────────┼────────────┤ │
│  │ Welcome      │ Welcome to Hotel!  │ Edit Preview│ │
│  │ Post-Stay    │ How was your stay? │ Edit Preview│ │
│  │ Special Offer│ Exclusive offer!   │ Edit Preview│ │
│  └──────────────┴────────────────────┴────────────┘ │
└─────────────────────────────────────────────────────┘
```

Edit view: Split pane — left side HTML editor (textarea with monospace font), right side live preview (iframe with srcdoc).

## Environment Variables

```env
# Already exists (used by auth, reused by campaigns)
RESEND_API_KEY=<from-resend.com>

# New (optional — defaults provided)
CAMPAIGN_FROM_EMAIL=noreply@hireme.dev
CAMPAIGN_FROM_NAME=HireMe Hotel CMS
CAMPAIGN_BATCH_SIZE=10
CAMPAIGN_TRACKING_BASE_URL=http://localhost:4001  # base URL for tracking pixels/links
```

## Verification

1. **Build**: shared-schema + backend + frontend compile clean
2. **Seed templates**: Start backend → 3 default templates created in DB
3. **Create template**: Via GraphQL mutation → template stored, visible in frontend
4. **Preview audience**: Set targeting rules `{ checkOutFrom: "2025-01-01" }` → returns matching count
5. **Send test email**: Call `sendTestEmail(templateId, "test@example.com")` → email received (or logged to console)
6. **Send campaign**: Create campaign → click Send → sends go out → stats update
7. **Open tracking**: Open email → pixel fires → `opened_at` recorded
8. **Click tracking**: Click link → redirect works → `clicked_at` recorded
9. **Stats page**: Campaign stats show open rate + click rate

## Phase 2 (future, not in scope)

- Scheduled sending (cron job or background worker)
- Drag-and-drop template builder (MJML or React Email)
- A/B testing (subject line variants)
- Unsubscribe management (opt-out list)
- Bounce handling (Resend webhook → update campaign_sends)
- Guest entity (separate `guests` table with merged profiles)
- Campaign duplication / clone

import { getPool } from '../event-sourcing/database';

export async function initializeCampaignTables(): Promise<void> {
  const client = await getPool().connect();

  try {
    // Add guest_email to reservations if not exists
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE reservations ADD COLUMN guest_email VARCHAR(255);
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END $$;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_guest_email ON reservations(guest_email);
    `);

    // Email templates
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        html_body TEXT NOT NULL,
        preview_text VARCHAR(255),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Campaigns
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        template_id UUID NOT NULL REFERENCES email_templates(id),
        targeting_rules JSONB NOT NULL DEFAULT '{}',
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        scheduled_at TIMESTAMPTZ,
        sent_at TIMESTAMPTZ,
        total_recipients INT NOT NULL DEFAULT 0,
        total_sent INT NOT NULL DEFAULT 0,
        total_failed INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Campaign sends
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaign_sends (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        recipient_email VARCHAR(255) NOT NULL,
        recipient_name VARCHAR(255),
        reservation_id UUID,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        resend_message_id VARCHAR(255),
        opened_at TIMESTAMPTZ,
        clicked_at TIMESTAMPTZ,
        error_message TEXT,
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign ON campaign_sends(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_campaign_sends_status ON campaign_sends(status);
    `);

    // Tracking events
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaign_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        send_id UUID NOT NULL REFERENCES campaign_sends(id) ON DELETE CASCADE,
        event_type VARCHAR(20) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_events_send ON campaign_events(send_id);
    `);

    console.log('[campaigns] Tables initialized');
  } finally {
    client.release();
  }
}

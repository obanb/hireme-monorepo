import { campaignConfig } from './config';
import { findCampaignById, updateCampaignStatus } from './campaign-repository';
import { findTemplateById } from './template-repository';
import { createSendBatch, updateSendStatus } from './send-repository';
import { getTargetAudience, TargetingRules } from './targeting';

let resendClient: any = null;

async function getResend() {
  if (!campaignConfig.resendApiKey) return null;
  if (!resendClient) {
    const { Resend } = await import('resend');
    resendClient = new Resend(campaignConfig.resendApiKey);
  }
  return resendClient;
}

function renderTemplate(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

function injectTracking(html: string, sendId: string, baseUrl: string): string {
  // Inject open tracking pixel before </body>
  const pixel = `<img src="${baseUrl}/track/open/${sendId}" width="1" height="1" style="display:none" alt="" />`;
  let result = html.includes('</body>')
    ? html.replace('</body>', `${pixel}</body>`)
    : html + pixel;

  // Rewrite href links for click tracking
  result = result.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_, url) => `href="${baseUrl}/track/click/${sendId}?url=${encodeURIComponent(url)}"`
  );

  return result;
}

export async function executeCampaign(campaignId: string): Promise<void> {
  const campaign = await findCampaignById(campaignId);
  if (!campaign) throw new Error('Campaign not found');
  if (campaign.status !== 'DRAFT') throw new Error(`Campaign is ${campaign.status}, not DRAFT`);

  const template = await findTemplateById(campaign.template_id);
  if (!template) throw new Error('Template not found');

  // Set status to SENDING
  await updateCampaignStatus(campaignId, 'SENDING');

  try {
    const rules: TargetingRules = campaign.targeting_rules as unknown as TargetingRules;
    const audience = await getTargetAudience(rules);

    if (audience.length === 0) {
      await updateCampaignStatus(campaignId, 'SENT', {
        sentAt: new Date(),
        totalRecipients: 0,
        totalSent: 0,
        totalFailed: 0,
      });
      return;
    }

    // Create send records
    const sends = await createSendBatch(
      campaignId,
      audience.map((r) => ({ email: r.email, name: r.name, reservationId: r.reservationId }))
    );

    await updateCampaignStatus(campaignId, 'SENDING', { totalRecipients: sends.length });

    const resend = await getResend();
    let totalSent = 0;
    let totalFailed = 0;

    // Send in batches
    for (let i = 0; i < sends.length; i += campaignConfig.batchSize) {
      const batch = sends.slice(i, i + campaignConfig.batchSize);

      await Promise.all(
        batch.map(async (send) => {
          const vars: Record<string, string> = {
            guest_name: send.recipient_name || 'Guest',
            guest_email: send.recipient_email,
            hotel_name: 'HireMe Hotel',
          };

          let html = renderTemplate(template.html_body, vars);
          html = injectTracking(html, send.id, campaignConfig.trackingBaseUrl);

          try {
            if (resend) {
              const result = await resend.emails.send({
                from: `${campaignConfig.fromName} <${campaignConfig.fromEmail}>`,
                to: send.recipient_email,
                subject: renderTemplate(template.subject, vars),
                html,
              });
              await updateSendStatus(send.id, 'SENT', { resendMessageId: result.data?.id });
            } else {
              console.log(`[campaigns] Would send to ${send.recipient_email}: ${template.subject}`);
              await updateSendStatus(send.id, 'SENT');
            }
            totalSent++;
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            await updateSendStatus(send.id, 'FAILED', { errorMessage: errorMsg });
            totalFailed++;
          }
        })
      );
    }

    await updateCampaignStatus(campaignId, 'SENT', {
      sentAt: new Date(),
      totalSent,
      totalFailed,
    });
  } catch (err) {
    await updateCampaignStatus(campaignId, 'FAILED');
    throw err;
  }
}

export async function sendTestEmail(templateId: string, recipientEmail: string): Promise<boolean> {
  const template = await findTemplateById(templateId);
  if (!template) throw new Error('Template not found');

  const vars: Record<string, string> = {
    guest_name: 'Test Guest',
    guest_email: recipientEmail,
    hotel_name: 'HireMe Hotel',
  };

  const html = renderTemplate(template.html_body, vars);
  const subject = renderTemplate(template.subject, vars);

  const resend = await getResend();
  if (resend) {
    await resend.emails.send({
      from: `${campaignConfig.fromName} <${campaignConfig.fromEmail}>`,
      to: recipientEmail,
      subject: `[TEST] ${subject}`,
      html,
    });
  } else {
    console.log(`[campaigns] Test email to ${recipientEmail}:`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body length: ${html.length} chars`);
  }

  return true;
}

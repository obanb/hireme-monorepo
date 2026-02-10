export const campaignConfig = {
  fromEmail: process.env.CAMPAIGN_FROM_EMAIL || 'noreply@hireme.dev',
  fromName: process.env.CAMPAIGN_FROM_NAME || 'HireMe Hotel CMS',
  batchSize: parseInt(process.env.CAMPAIGN_BATCH_SIZE || '10', 10),
  trackingBaseUrl: process.env.CAMPAIGN_TRACKING_BASE_URL || 'http://localhost:4001',
  resendApiKey: process.env.RESEND_API_KEY || '',
};

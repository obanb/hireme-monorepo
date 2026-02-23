import { requireAuth, requireRole, AuthContext } from "../auth";
import {
  createTemplate,
  findTemplateById,
  updateTemplate,
  deleteTemplate,
  listTemplates,
  createCampaign,
  findCampaignById,
  updateCampaign as updateCampaignRepo,
  deleteCampaign,
  listCampaigns,
  listSends,
  getCampaignStats,
  previewAudience,
  executeCampaign,
  sendTestEmail,
} from "../campaigns";
import { formatEmailTemplate, formatCampaign, formatCampaignSend } from "../formatters/campaign.formatter";

export const campaignResolvers = {
  Query: {
    emailTemplates: async (_: unknown, args: { includeInactive?: boolean }, context: AuthContext) => {
      requireAuth(context);
      const templates = await listTemplates(args.includeInactive);
      return templates.map(formatEmailTemplate);
    },

    emailTemplate: async (_: unknown, args: { id: string }, context: AuthContext) => {
      requireAuth(context);
      const template = await findTemplateById(args.id);
      return template ? formatEmailTemplate(template) : null;
    },

    campaigns: async (_: unknown, __: unknown, context: AuthContext) => {
      requireAuth(context);
      const campaigns = await listCampaigns();
      return campaigns.map(formatCampaign);
    },

    campaign: async (_: unknown, args: { id: string }, context: AuthContext) => {
      requireAuth(context);
      const campaign = await findCampaignById(args.id);
      return campaign ? formatCampaign(campaign) : null;
    },

    campaignStats: async (_: unknown, args: { campaignId: string }, context: AuthContext) => {
      requireAuth(context);
      const stats = await getCampaignStats(args.campaignId);
      const totalSent = stats.total_sent || 1;
      return {
        totalRecipients: stats.total_recipients,
        totalSent: stats.total_sent,
        totalFailed: stats.total_failed,
        totalOpened: stats.total_opened,
        totalClicked: stats.total_clicked,
        openRate: stats.total_sent > 0 ? stats.total_opened / totalSent : 0,
        clickRate: stats.total_sent > 0 ? stats.total_clicked / totalSent : 0,
      };
    },

    campaignSends: async (_: unknown, args: { campaignId: string; limit?: number; offset?: number }, context: AuthContext) => {
      requireAuth(context);
      const sends = await listSends(args.campaignId, args.limit, args.offset);
      return sends.map(formatCampaignSend);
    },

    previewTargetAudience: async (_: unknown, args: { targetingRules: string }, context: AuthContext) => {
      requireAuth(context);
      const rules = JSON.parse(args.targetingRules);
      return previewAudience(rules);
    },
  },

  Mutation: {
    createEmailTemplate: async (_: unknown, args: { input: { name: string; subject: string; htmlBody: string; previewText?: string } }, context: AuthContext) => {
      requireAuth(context);
      const template = await createTemplate(args.input);
      return formatEmailTemplate(template);
    },

    updateEmailTemplate: async (_: unknown, args: { id: string; input: { name?: string; subject?: string; htmlBody?: string; previewText?: string; isActive?: boolean } }, context: AuthContext) => {
      requireAuth(context);
      const template = await updateTemplate(args.id, args.input);
      if (!template) throw new Error('Template not found');
      return formatEmailTemplate(template);
    },

    deleteEmailTemplate: async (_: unknown, args: { id: string }, context: AuthContext) => {
      requireRole(context, 'ADMIN');
      return deleteTemplate(args.id);
    },

    createCampaign: async (_: unknown, args: { input: { name: string; templateId: string; targetingRules: string; scheduledAt?: string } }, context: AuthContext) => {
      requireAuth(context);
      const campaign = await createCampaign(args.input);
      return formatCampaign(campaign);
    },

    updateCampaign: async (_: unknown, args: { id: string; input: { name?: string; templateId?: string; targetingRules?: string; scheduledAt?: string } }, context: AuthContext) => {
      requireAuth(context);
      const campaign = await updateCampaignRepo(args.id, args.input);
      if (!campaign) throw new Error('Campaign not found');
      return formatCampaign(campaign);
    },

    deleteCampaign: async (_: unknown, args: { id: string }, context: AuthContext) => {
      requireRole(context, 'ADMIN');
      return deleteCampaign(args.id);
    },

    sendCampaign: async (_: unknown, args: { id: string }, context: AuthContext) => {
      requireAuth(context);
      await executeCampaign(args.id);
      const campaign = await findCampaignById(args.id);
      if (!campaign) throw new Error('Campaign not found');
      return formatCampaign(campaign);
    },

    sendTestEmail: async (_: unknown, args: { templateId: string; recipientEmail: string }, context: AuthContext) => {
      requireAuth(context);
      return sendTestEmail(args.templateId, args.recipientEmail);
    },
  },

  Campaign: {
    template: async (parent: { templateId: string }) => {
      const template = await findTemplateById(parent.templateId);
      return template ? formatEmailTemplate(template) : null;
    },
  },
};

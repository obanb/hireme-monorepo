import { Router, Request, Response } from 'express';
import { requireAdmin } from '../auth/middleware';
import * as webhookRepo from '../repositories/webhook.repo';
import * as deliveryRepo from '../repositories/delivery.repo';
import { deliver } from '../delivery/sender';
import { v4 as uuid } from 'uuid';

const router = Router();

// All routes require admin
router.use(requireAdmin);

// POST /api/webhooks — Register a webhook
router.post('/', async (req: Request, res: Response) => {
  try {
    const { url, eventFilters, description } = req.body;

    if (!url || !Array.isArray(eventFilters) || eventFilters.length === 0) {
      res.status(400).json({ error: 'url and eventFilters (non-empty array) are required' });
      return;
    }

    const webhook = await webhookRepo.createWebhook({
      url,
      eventFilters,
      description,
      createdBy: req.user!.userId,
    });

    res.status(201).json({
      id: webhook.id,
      url: webhook.url,
      secret: webhook.secret, // shown only at creation
      eventFilters: webhook.event_filters,
      description: webhook.description,
      isActive: webhook.is_active,
      createdAt: webhook.created_at,
    });
  } catch (err) {
    console.error('Error creating webhook:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/webhooks — List all webhooks
router.get('/', async (_req: Request, res: Response) => {
  try {
    const webhooks = await webhookRepo.listWebhooks();
    res.json(
      webhooks.map((w) => ({
        id: w.id,
        url: w.url,
        eventFilters: w.event_filters,
        description: w.description,
        isActive: w.is_active,
        disabledReason: w.disabled_reason,
        consecutiveFailures: w.consecutive_failures,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
      }))
    );
  } catch (err) {
    console.error('Error listing webhooks:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/webhooks/:id — Get webhook details with stats
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const webhook = await webhookRepo.getWebhookById(req.params.id);
    if (!webhook) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }

    const stats = await deliveryRepo.getDeliveryStats(webhook.id);

    res.json({
      id: webhook.id,
      url: webhook.url,
      eventFilters: webhook.event_filters,
      description: webhook.description,
      isActive: webhook.is_active,
      disabledReason: webhook.disabled_reason,
      consecutiveFailures: webhook.consecutive_failures,
      createdAt: webhook.created_at,
      updatedAt: webhook.updated_at,
      stats: {
        totalSent: stats.total,
        successful: stats.successful,
        failed: stats.failed,
        successRate: stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : null,
        lastDeliveryStatus: stats.lastStatus,
      },
    });
  } catch (err) {
    console.error('Error getting webhook:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/webhooks/:id — Update a webhook
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { url, eventFilters, description, isActive } = req.body;

    const webhook = await webhookRepo.updateWebhook(req.params.id, {
      url,
      eventFilters,
      description,
      isActive,
    });

    if (!webhook) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }

    res.json({
      id: webhook.id,
      url: webhook.url,
      eventFilters: webhook.event_filters,
      description: webhook.description,
      isActive: webhook.is_active,
      disabledReason: webhook.disabled_reason,
      updatedAt: webhook.updated_at,
    });
  } catch (err) {
    console.error('Error updating webhook:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/webhooks/:id — Soft-delete a webhook
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await webhookRepo.softDeleteWebhook(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting webhook:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/webhooks/:id/test — Send test payload
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const webhook = await webhookRepo.getWebhookById(req.params.id);
    if (!webhook) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }

    const testPayload = {
      id: `del_${uuid()}`,
      type: 'reservation.created',
      timestamp: new Date().toISOString(),
      data: {
        reservationId: `test-${uuid()}`,
        status: 'PENDING',
        guestName: 'Test Guest',
        guestEmail: 'test@example.com',
        checkInDate: '2026-03-01',
        checkOutDate: '2026-03-05',
        roomId: null,
        totalAmount: 500,
        currency: 'EUR',
      },
    };

    const delivery = await deliveryRepo.createDelivery({
      webhookId: webhook.id,
      eventId: null,
      eventType: 'reservation.created',
      payload: testPayload,
    });

    await deliver(webhook, delivery);

    const updated = await deliveryRepo.getDeliveriesForWebhook(webhook.id, 1);
    const result = updated[0];

    res.json({
      deliveryId: result.id,
      status: result.status,
      responseCode: result.response_code,
    });
  } catch (err) {
    console.error('Error testing webhook:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import express from 'express';
import { recordEvent, getSendById } from './send-repository';

const TRANSPARENT_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export function mountTrackingRoutes(app: express.Express): void {
  // Open tracking pixel
  app.get('/track/open/:sendId', async (req, res) => {
    try {
      const send = await getSendById(req.params.sendId);
      if (send) {
        await recordEvent(send.id, 'OPEN');
      }
    } catch (err) {
      console.error('[tracking] Open event error:', err);
    }

    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.send(TRANSPARENT_GIF);
  });

  // Click tracking redirect
  app.get('/track/click/:sendId', async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      res.status(400).send('Missing url');
      return;
    }

    try {
      const send = await getSendById(req.params.sendId);
      if (send) {
        await recordEvent(send.id, 'CLICK', { url });
      }
    } catch (err) {
      console.error('[tracking] Click event error:', err);
    }

    res.redirect(url);
  });
}

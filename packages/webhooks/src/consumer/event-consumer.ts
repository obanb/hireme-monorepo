import amqp from 'amqplib';
import { config } from '../config';
import * as webhookRepo from '../repositories/webhook.repo';
import * as deliveryRepo from '../repositories/delivery.repo';
import { deliver } from '../delivery/sender';
import { v4 as uuid } from 'uuid';

// Map RabbitMQ routing keys to webhook event types
const EVENT_TYPE_MAP: Record<string, string> = {
  'event.ReservationCreated': 'reservation.created',
  'event.ReservationConfirmed': 'reservation.confirmed',
  'event.ReservationCancelled': 'reservation.cancelled',
  'event.RoomAssigned': 'reservation.room_assigned',
};

const BINDING_KEYS = Object.keys(EVENT_TYPE_MAP);

let connection: amqp.ChannelModel | null = null;
let channel: amqp.Channel | null = null;

export async function startConsumer(): Promise<void> {
  const { url, exchange, queue } = config.rabbitmq;

  const conn = await amqp.connect(url);
  connection = conn;
  const ch = await conn.createChannel();
  channel = ch;

  await ch.assertExchange(exchange, 'topic', { durable: true });
  await ch.assertQueue(queue, { durable: true });

  for (const key of BINDING_KEYS) {
    await ch.bindQueue(queue, exchange, key);
  }

  await ch.prefetch(10);

  console.log(`Consumer started. Queue: ${queue}, bindings: ${BINDING_KEYS.join(', ')}`);

  ch.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      const routingKey = msg.fields.routingKey;
      const eventType = EVENT_TYPE_MAP[routingKey];

      if (!eventType) {
        console.warn(`Unknown routing key: ${routingKey}, acking and skipping`);
        ch.ack(msg);
        return;
      }

      const webhooks = await webhookRepo.getActiveWebhooksForEvent(eventType);

      for (const webhook of webhooks) {
        const payload = {
          id: `del_${uuid()}`,
          type: eventType,
          timestamp: event.occurredAt || new Date().toISOString(),
          data: event.data || event,
        };

        const delivery = await deliveryRepo.createDelivery({
          webhookId: webhook.id,
          eventId: event.id?.toString() ?? null,
          eventType,
          payload,
        });

        try {
          await deliver(webhook, delivery);
        } catch (err) {
          console.error(`Delivery failed for webhook ${webhook.id}:`, err);
        }
      }

      ch.ack(msg);
    } catch (err) {
      console.error('Error processing message:', err);
      ch.nack(msg, false, false);
    }
  });
}

export async function stopConsumer(): Promise<void> {
  if (channel) {
    await channel.close();
    channel = null;
  }
  if (connection) {
    await connection.close().catch(() => {});
    connection = null;
  }
  console.log('Consumer stopped');
}

import * as amqp from 'amqplib';
import { EventBus } from './EventBus';
import { DomainEvent } from '../../domain/shared/DomainEvent';

export class RabbitMQEventBus implements EventBus {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private exchangeName: string = 'domain-events';
  private subscribers: Map<string, Array<(event: DomainEvent) => Promise<void>>> = new Map();

  constructor(private url: string) {}

  async connect(): Promise<void> {
    if (this.connection) {
      return;
    }

    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createChannel();

    // Declare topic exchange for routing events by type
    await this.channel.assertExchange(this.exchangeName, 'topic', {
      durable: true
    });

    console.log('✅ Connected to RabbitMQ');
  }

  async publish(event: DomainEvent): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    const routingKey = `event.${event.type}`;
    const message = JSON.stringify(event);

    this.channel!.publish(this.exchangeName, routingKey, Buffer.from(message), {
      persistent: true,
      timestamp: Date.now()
    });

    console.log(`📤 Published event: ${event.type} (${event.aggregateId})`);
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  async subscribe(
    eventType: string,
    handler: (event: DomainEvent) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    // Create queue for this event type
    const queueName = `events.${eventType}`;
    await this.channel!.assertQueue(queueName, { durable: true });

    // Bind queue to exchange
    const routingKey = `event.${eventType}`;
    await this.channel!.bindQueue(queueName, this.exchangeName, routingKey);

    // Store handler
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);

    // Consume messages
    await this.channel!.consume(queueName, async (msg) => {
      if (!msg) return;

      try {
        const event: DomainEvent = JSON.parse(msg.content.toString());
        const handlers = this.subscribers.get(eventType) || [];

        for (const handler of handlers) {
          await handler(event);
        }

        this.channel!.ack(msg);
        console.log(`✅ Processed event: ${eventType} (${event.aggregateId})`);
      } catch (error) {
        console.error(`❌ Error processing event ${eventType}:`, error);
        this.channel!.nack(msg, false, true); // Requeue on error
      }
    });

    console.log(`👂 Subscribed to event type: ${eventType}`);
  }

  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }
}


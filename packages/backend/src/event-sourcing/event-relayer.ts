/**
 * Event Relayer (Polling Publisher)
 *
 * Polls the event store for new events and publishes them to RabbitMQ.
 * Implements at-least-once delivery semantics with checkpoint tracking.
 */
import amqp from 'amqplib';
import { config } from './config';
import { getUnprocessedEvents, getCheckpoint, updateCheckpoint, StoredEvent } from './event-store';

export class EventRelayer {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the event relayer
   * Connects to RabbitMQ and begins polling for events
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Event relayer is already running');
      return;
    }

    try {
      // Connect to RabbitMQ
      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      // Declare the exchange
      await this.channel.assertExchange(config.rabbitmq.exchange, 'topic', {
        durable: true,
      });

      console.log(`Event relayer connected to RabbitMQ at ${config.rabbitmq.url}`);
      console.log(`Publishing to exchange: ${config.rabbitmq.exchange}`);

      this.isRunning = true;

      // Start polling loop
      this.intervalId = setInterval(
        () => this.processBatch(),
        config.eventRelayer.pollingIntervalMs
      );

      // Handle connection errors
      this.connection.on('error', (err: Error) => {
        console.error('RabbitMQ connection error:', err);
        this.stop();
      });

      this.connection.on('close', () => {
        console.warn('RabbitMQ connection closed');
        this.isRunning = false;
      });
    } catch (error) {
      console.error('Failed to start event relayer:', error);
      throw error;
    }
  }

  /**
   * Stop the event relayer
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }

    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }

    console.log('Event relayer stopped');
  }

  /**
   * Process a batch of unprocessed events
   */
  private async processBatch(): Promise<void> {
    if (!this.channel || !this.isRunning) {
      return;
    }

    try {
      // Get the current checkpoint
      const lastProcessedId = await getCheckpoint(config.rabbitmq.publisherId);

      // Fetch unprocessed events
      const events = await getUnprocessedEvents(
        lastProcessedId,
        config.eventRelayer.batchSize
      );

      if (events.length === 0) {
        return;
      }

      console.log(`Processing ${events.length} events starting from ID ${lastProcessedId + 1}`);

      let maxId = lastProcessedId;

      // Publish each event
      for (const event of events) {
        await this.publishEvent(event);
        maxId = event.id;
      }

      // Update checkpoint after successful publishing
      await updateCheckpoint(config.rabbitmq.publisherId, maxId);

      console.log(`Published ${events.length} events. Checkpoint updated to ${maxId}`);
    } catch (error) {
      console.error('Error processing event batch:', error);
    }
  }

  /**
   * Publish a single event to RabbitMQ
   */
  private async publishEvent(event: StoredEvent): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not available');
    }

    const routingKey = `event.${event.type}`;
    const message = {
      id: event.id,
      streamId: event.streamId,
      version: event.version,
      type: event.type,
      data: event.data,
      metadata: event.metadata,
      occurredAt: event.occurredAt.toISOString(),
    };

    this.channel.publish(
      config.rabbitmq.exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        contentType: 'application/json',
      }
    );
  }

  /**
   * Manually trigger event processing (useful for testing)
   */
  async processNow(): Promise<void> {
    await this.processBatch();
  }
}

// Singleton instance
export const eventRelayer = new EventRelayer();

/**
 * Example consumer setup (for external services)
 * This demonstrates how to consume events from RabbitMQ
 */
export async function createExampleConsumer(
  queueName: string,
  bindingKeys: string[],
  handler: (event: StoredEvent) => Promise<void>
): Promise<{ close: () => Promise<void> }> {
  const connection = await amqp.connect(config.rabbitmq.url);
  const channel = await connection.createChannel();

  // Declare the exchange
  await channel.assertExchange(config.rabbitmq.exchange, 'topic', {
    durable: true,
  });

  // Declare and bind the queue
  const q = await channel.assertQueue(queueName, { durable: true });

  for (const key of bindingKeys) {
    await channel.bindQueue(q.queue, config.rabbitmq.exchange, key);
  }

  // Start consuming
  await channel.consume(
    q.queue,
    async (msg) => {
      if (!msg) return;

      try {
        const event = JSON.parse(msg.content.toString()) as StoredEvent;
        await handler(event);
        channel.ack(msg);
      } catch (error) {
        console.error('Error processing message:', error);
        // Negative acknowledge - will be requeued
        channel.nack(msg, false, true);
      }
    },
    { noAck: false }
  );

  console.log(`Consumer started on queue: ${queueName}`);

  return {
    close: async () => {
      await channel.close();
      await connection.close();
    },
  };
}

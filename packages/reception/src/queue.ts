import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";

export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
});

export function createQueue(name: string): Queue {
  return new Queue(name, { connection: redisConnection });
}

export function createWorker(
  name: string,
  processor: (job: Job) => Promise<unknown>
): Worker {
  return new Worker(name, processor, { connection: redisConnection });
}

/**
 * Minimal queue abstraction.
 *
 * Jobs run in-process by default (fine for development and small loads).
 * When REDIS_URL is set, the same interface can be backed by a Redis list –
 * swap the implementation here without touching producers.
 */

export type JobHandler<T> = (payload: T) => Promise<void>;

interface QueueJob {
  name: string;
  payload: unknown;
  runAt: number;
}

const handlers = new Map<string, JobHandler<never>>();
const pending: QueueJob[] = [];
let draining = false;

export function registerJobHandler<T>(name: string, handler: JobHandler<T>): void {
  handlers.set(name, handler as JobHandler<never>);
}

export async function enqueueJob<T>(name: string, payload: T, delayMs = 0): Promise<void> {
  pending.push({ name, payload, runAt: Date.now() + delayMs });
  void drain();
}

async function drain(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    while (pending.length > 0) {
      const now = Date.now();
      const index = pending.findIndex((j) => j.runAt <= now);
      if (index === -1) {
        const next = Math.min(...pending.map((j) => j.runAt));
        await new Promise((resolve) => setTimeout(resolve, Math.max(10, next - now)));
        continue;
      }
      const [job] = pending.splice(index, 1);
      if (!job) continue;
      const handler = handlers.get(job.name);
      if (!handler) {
        console.error(`[queue] no handler for job "${job.name}"`);
        continue;
      }
      try {
        await handler(job.payload as never);
      } catch (err) {
        console.error(`[queue] job "${job.name}" failed`, err);
      }
    }
  } finally {
    draining = false;
  }
}

/**
 * Sliding-window rate limiter with a Redis backend when REDIS_URL is set and
 * an in-memory fallback otherwise (fine for a single dev process; use Redis
 * in production).
 */
import { env } from "@/lib/env";

interface RateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

// ---------------------------------------------------------------------------
// In-memory backend
// ---------------------------------------------------------------------------

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function memoryCheck(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(opts.key);
  if (!entry || entry.resetAt <= now) {
    memoryStore.set(opts.key, { count: 1, resetAt: now + opts.windowSeconds * 1000 });
    return { allowed: true, remaining: opts.limit - 1, resetInSeconds: opts.windowSeconds };
  }
  entry.count += 1;
  const resetInSeconds = Math.ceil((entry.resetAt - now) / 1000);
  if (entry.count > opts.limit) {
    return { allowed: false, remaining: 0, resetInSeconds };
  }
  return { allowed: true, remaining: opts.limit - entry.count, resetInSeconds };
}

// Periodically prune expired entries to keep the map small.
if (typeof setInterval !== "undefined") {
  const interval = setInterval(() => {
    const now = Date.now();
    memoryStore.forEach((entry, key) => {
      if (entry.resetAt <= now) memoryStore.delete(key);
    });
  }, 60_000);
  if (typeof interval === "object" && "unref" in interval) interval.unref();
}

// ---------------------------------------------------------------------------
// Redis backend (lazy import so the app runs without ioredis connectivity)
// ---------------------------------------------------------------------------

type RedisLike = {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
};

let redisClient: RedisLike | null | undefined;

async function getRedis(): Promise<RedisLike | null> {
  if (redisClient !== undefined) return redisClient;
  if (!env.redisUrl) {
    redisClient = null;
    return null;
  }
  try {
    const { default: Redis } = await import("ioredis");
    redisClient = new Redis(env.redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: false,
    }) as unknown as RedisLike;
  } catch {
    redisClient = null;
  }
  return redisClient;
}

async function redisCheck(redis: RedisLike, opts: RateLimitOptions): Promise<RateLimitResult> {
  const key = `ratelimit:${opts.key}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, opts.windowSeconds);
  }
  const ttl = await redis.ttl(key);
  const resetInSeconds = ttl > 0 ? ttl : opts.windowSeconds;
  if (count > opts.limit) {
    return { allowed: false, remaining: 0, resetInSeconds };
  }
  return { allowed: true, remaining: opts.limit - count, resetInSeconds };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function checkRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const redis = await getRedis();
  if (redis) {
    try {
      return await redisCheck(redis, opts);
    } catch {
      // fall through to memory on Redis hiccups
    }
  }
  return memoryCheck(opts);
}

/** Standard limits used across the app. */
export const RATE_LIMITS = {
  auth: { limit: 10, windowSeconds: 300 },
  api: { limit: 120, windowSeconds: 60 },
  offerSend: { limit: 30, windowSeconds: 3600 },
  campaignSend: { limit: 3, windowSeconds: 3600 },
  messageSend: { limit: 60, windowSeconds: 3600 },
  registration: { limit: 5, windowSeconds: 3600 },
} as const;

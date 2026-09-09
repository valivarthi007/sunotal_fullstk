import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_HOST || "redis://localhost:6379";

let redisClient: any = null;

try {
  redisClient = new (Redis as any)(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy(times: number) {
      if (times > 3) {
        console.warn("⚠️ Redis unavailable, falling back to pass-through memory mode.");
        return null;
      }
      return Math.min(times * 100, 2000);
    },
  });

  redisClient.on("connect", () => {
    console.log("⚡ Connected to Redis Caching Container");
  });

  redisClient.on("error", (err: any) => {
    console.warn("⚠️ Redis container error (pass-through active):", err?.message || err);
  });
} catch (err) {
  console.warn("⚠️ Failed to initialize Redis client:", err);
}

export async function getCache<T>(key: string): Promise<T | null> {
  if (!redisClient) return null;
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Pass-through
  }
}

export async function invalidateCache(keyPattern: string): Promise<void> {
  if (!redisClient) return;
  try {
    const keys = await redisClient.keys(keyPattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch {
    // Pass-through
  }
}

export default redisClient;

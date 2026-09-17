import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
    redisClient.on('error', (err) => {
      console.error('❌ Redis Lock Client Error:', err.message);
    });
  }
  return redisClient;
}

/**
 * 10-Minute Temporary Stock Lock during Checkout (Blinkit/Instamart Pattern)
 * Locks requested quantity for user for `ttlSeconds` (default: 600s = 10 mins)
 */
export async function reserveStockLock(
  productId: string,
  userId: string,
  quantity: number,
  ttlSeconds = 600
): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const lockKey = `lock:stock:${productId}:${userId}`;
    const result = await redis.set(lockKey, String(quantity), 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (err) {
    console.error(`[StockLock Error] failed to reserve stock for ${productId}:`, err);
    return false;
  }
}

/**
 * Release Stock Lock upon Checkout Completion or Cancellation
 */
export async function releaseStockLock(productId: string, userId: string): Promise<void> {
  try {
    const redis = getRedisClient();
    const lockKey = `lock:stock:${productId}:${userId}`;
    await redis.del(lockKey);
  } catch (err) {
    console.error(`[StockLock Error] failed to release lock for ${productId}:`, err);
  }
}

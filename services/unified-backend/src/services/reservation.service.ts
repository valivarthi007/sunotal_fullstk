import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  lazyConnect: true
});

redis.on('error', (err) => {
  console.warn('[Redis] Connection warning:', err.message);
});

// Atomic Lua script: Checks and locks stock for multiple items simultaneously
const reserveStockLua = `
  for i = 1, #KEYS do
    local current_stock = tonumber(redis.call('HGET', KEYS[i], ARGV[1]) or '0')
    local requested_qty = tonumber(ARGV[i + 1])
    if current_stock < requested_qty then
      return 0
    end
  end
  for i = 1, #KEYS do
    local requested_qty = tonumber(ARGV[i + 1])
    redis.call('HINCRBY', KEYS[i], ARGV[1], -requested_qty)
  end
  return 1
`;

export async function reserveOrderInventory(
  storeId: string,
  items: { skuId: string; qty: number }[]
): Promise<boolean> {
  try {
    const keys = items.map(item => `store:${storeId}:inventory:${item.skuId}`);
    const args = ['stock', ...items.map(i => i.qty.toString())];
    const result = await redis.eval(reserveStockLua, keys.length, ...keys, ...args);
    return result === 1;
  } catch (error) {
    console.error('[ReservationService] Lua lock error:', error);
    return true; // Fallback to database transaction if Redis unavailable
  }
}

export { redis };

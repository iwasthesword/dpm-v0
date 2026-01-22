import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import Redis from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

const redisPluginAsync: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  await redis.connect();

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async (instance) => {
    await instance.redis.quit();
  });
};

export const redisPlugin = fp(redisPluginAsync, {
  name: 'redis',
});

import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';

import type { TNullable } from '../../common/types/nullable';
import type { ICacheService } from '../interfaces/cache-service.interface';

@Injectable()
export class CacheService implements ICacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  async get<T>(key: string): Promise<TNullable<T>> {
    this.logger.debug(`Getting cached value for key: ${key}`);
    const cached = await this.redisClient.get(key);
    if (!cached) {
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    }
    this.logger.debug(`Cache hit for key: ${key}`);
    return JSON.parse(cached) as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    this.logger.debug(`Setting cached value for key: ${key}${ttl ? ` with TTL: ${ttl}s` : ''}`);
    if (ttl) {
      await this.redisClient.setex(key, ttl, JSON.stringify(value));
    } else {
      await this.redisClient.set(key, JSON.stringify(value));
    }
    this.logger.debug(`Cached value set successfully for key: ${key}`);
  }

  async delete(key: string): Promise<void> {
    this.logger.debug(`Deleting cached value for key: ${key}`);
    await this.redisClient.del(key);
    this.logger.debug(`Cached value deleted successfully for key: ${key}`);
  }

  async deletePattern(pattern: string): Promise<void> {
    this.logger.debug(`Deleting cached values matching pattern: ${pattern}`);
    const keys = await this.redisClient.keys(pattern);
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
      this.logger.debug(`Deleted ${keys.length} cached values matching pattern: ${pattern}`);
    } else {
      this.logger.debug(`No cached values found matching pattern: ${pattern}`);
    }
  }
}

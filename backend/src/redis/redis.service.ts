import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';

import type { TNullable } from '../common/types/nullable';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async get(key: string): Promise<TNullable<string>> {
    this.logger.debug(`Getting key: ${key}`);
    const result = await this.redis.get(key);
    this.logger.debug(`Key ${key} ${result ? 'found' : 'not found'}`);
    return result;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    this.logger.debug(`Setting key: ${key}${ttl ? ` with TTL: ${ttl}s` : ''}`);
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
    this.logger.debug(`Key ${key} set successfully`);
  }

  async del(key: string): Promise<void> {
    this.logger.debug(`Deleting key: ${key}`);
    await this.redis.del(key);
    this.logger.debug(`Key ${key} deleted successfully`);
  }

  async keys(pattern: string): Promise<string[]> {
    this.logger.debug(`Getting keys with pattern: ${pattern}`);
    const result = await this.redis.keys(pattern);
    this.logger.debug(`Found ${result.length} keys matching pattern: ${pattern}`);
    return result;
  }
}

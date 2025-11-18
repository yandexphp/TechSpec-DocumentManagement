import type { TNullable } from '../../common/types/nullable';

export const CACHE_SERVICE_TOKEN = Symbol('ICacheService');

export interface ICacheService {
  get<T>(key: string): Promise<TNullable<T>>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
}

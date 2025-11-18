import { Test, type TestingModule } from '@nestjs/testing';

import { CacheService } from '../cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let redisClient: {
    get: jest.Mock;
    set: jest.Mock;
    setex: jest.Mock;
    del: jest.Mock;
    keys: jest.Mock;
  };

  beforeEach(async () => {
    redisClient = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: 'REDIS_CLIENT',
          useValue: redisClient,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return cached value', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      redisClient.get.mockResolvedValue(JSON.stringify(value));

      const result = await service.get(key);

      expect(result).toEqual(value);
      expect(redisClient.get).toHaveBeenCalledWith(key);
    });

    it('should return null if key not found', async () => {
      const key = 'test-key';
      redisClient.get.mockResolvedValue(null);

      const result = await service.get(key);

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value without TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test' };

      await service.set(key, value);

      expect(redisClient.set).toHaveBeenCalledWith(key, JSON.stringify(value));
    });

    it('should set value with TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const ttl = 60;

      await service.set(key, value, ttl);

      expect(redisClient.setex).toHaveBeenCalledWith(key, ttl, JSON.stringify(value));
    });
  });

  describe('delete', () => {
    it('should delete key', async () => {
      const key = 'test-key';

      await service.delete(key);

      expect(redisClient.del).toHaveBeenCalledWith(key);
    });
  });

  describe('deletePattern', () => {
    it('should delete keys matching pattern', async () => {
      const pattern = 'test:*';
      const keys = ['test:1', 'test:2'];
      redisClient.keys.mockResolvedValue(keys);

      await service.deletePattern(pattern);

      expect(redisClient.keys).toHaveBeenCalledWith(pattern);
      expect(redisClient.del).toHaveBeenCalledWith(...keys);
    });

    it('should not delete if no keys match', async () => {
      const pattern = 'test:*';
      redisClient.keys.mockResolvedValue([]);

      await service.deletePattern(pattern);

      expect(redisClient.del).not.toHaveBeenCalled();
    });
  });
});

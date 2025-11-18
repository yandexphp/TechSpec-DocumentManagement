import { Test, type TestingModule } from '@nestjs/testing';

import { RedisService } from '../redis.service';

describe('RedisService', () => {
  let service: RedisService;

  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should get value from redis', async () => {
      const key = 'test-key';
      const value = 'test-value';

      mockRedisClient.get.mockResolvedValue(value);

      const result = await service.get(key);

      expect(result).toBe(value);
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
    });

    it('should return null if key not found', async () => {
      const key = 'non-existent-key';

      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get(key);

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value without TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';

      mockRedisClient.set.mockResolvedValue('OK');

      await service.set(key, value);

      expect(mockRedisClient.set).toHaveBeenCalledWith(key, value);
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });

    it('should set value with TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 60;

      mockRedisClient.setex.mockResolvedValue('OK');

      await service.set(key, value, ttl);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(key, ttl, value);
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });
  });

  describe('del', () => {
    it('should delete key', async () => {
      const key = 'test-key';

      mockRedisClient.del.mockResolvedValue(1);

      await service.del(key);

      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
    });
  });

  describe('keys', () => {
    it('should get keys by pattern', async () => {
      const pattern = 'test:*';
      const keys = ['test:1', 'test:2'];

      mockRedisClient.keys.mockResolvedValue(keys);

      const result = await service.keys(pattern);

      expect(result).toEqual(keys);
      expect(mockRedisClient.keys).toHaveBeenCalledWith(pattern);
    });
  });
});

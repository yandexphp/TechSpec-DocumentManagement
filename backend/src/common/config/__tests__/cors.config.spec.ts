import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import { createCorsOptions } from '../cors.config';

describe('createCorsOptions', () => {
  let configService: ConfigService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();
    configService = module.get<ConfigService>(ConfigService);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should create CORS options with frontend URL from config', () => {
    const frontendUrl = 'http://localhost:5173';
    (configService.get as jest.Mock).mockReturnValue(frontendUrl);
    const options = createCorsOptions(configService);
    expect(typeof options.origin).toBe('function');
    const callback = jest.fn();
    if (typeof options.origin === 'function') {
      options.origin(frontendUrl, callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    }
    expect(options.credentials).toBe(true);
    expect(options.methods).toContain('GET');
    expect(options.methods).toContain('POST');
    expect(options.allowedHeaders).toContain('Content-Type');
  });
  it('should use default frontend URL if not configured', () => {
    (configService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
      if (key === 'FRONTEND_URL') return undefined;
      return defaultValue;
    });
    const options = createCorsOptions(configService);
    expect(typeof options.origin).toBe('function');
    const callback = jest.fn();
    if (typeof options.origin === 'function') {
      options.origin('http://localhost:5173', callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    }
  });
  it('should include all required HTTP methods', () => {
    const options = createCorsOptions(configService);
    expect(options.methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']);
  });
  it('should include required headers', () => {
    const options = createCorsOptions(configService);
    expect(options.allowedHeaders).toEqual(['Content-Type', 'Authorization', 'Cookie']);
  });
});

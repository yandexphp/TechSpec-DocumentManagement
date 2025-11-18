import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import { AntivirusService } from '../antivirus.service';

const mockCreateScanner = jest.fn();
const mockPing = jest.fn();

jest.mock(
  'clamav.js',
  () => ({
    __esModule: true,
    default: {
      createScanner: (...args: unknown[]) => mockCreateScanner(...args),
      ping: (...args: unknown[]) => mockPing(...args),
    },
    createScanner: (...args: unknown[]) => mockCreateScanner(...args),
    ping: (...args: unknown[]) => mockPing(...args),
  }),
  { virtual: false }
);

describe('AntivirusService', () => {
  let loggerErrorSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  beforeAll(() => {
    loggerErrorSpy = jest
      .spyOn(require('@nestjs/common').Logger.prototype, 'error')
      .mockImplementation(() => {});
    loggerWarnSpy = jest
      .spyOn(require('@nestjs/common').Logger.prototype, 'warn')
      .mockImplementation(() => {});
  });

  afterAll(() => {
    loggerErrorSpy.mockRestore();
    loggerWarnSpy.mockRestore();
  });
  let service: AntivirusService;
  let _configService: ConfigService;
  let mockScanner: {
    scan: jest.Mock;
  };

  const defaultConfigValues: Record<string, string> = {
    ANTIVIRUS_ENABLED: 'true',
    CLAMAV_HOST: 'localhost',
    CLAMAV_PORT: '3310',
    ANTIVIRUS_FAIL_ON_ERROR: 'true',
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
      return defaultConfigValues[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockScanner = {
      scan: jest.fn(),
    };

    mockCreateScanner.mockReturnValue(mockScanner);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AntivirusService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AntivirusService>(AntivirusService);
    _configService = module.get<ConfigService>(ConfigService);

    await new Promise((resolve) => setTimeout(resolve, 50));

    if (defaultConfigValues.ANTIVIRUS_ENABLED === 'true') {
      (service as unknown as { scanner: typeof mockScanner }).scanner = mockScanner;
      (
        service as unknown as {
          clamavModule: { createScanner: jest.Mock; ping: jest.Mock };
        }
      ).clamavModule = {
        createScanner: mockCreateScanner,
        ping: mockPing,
      } as unknown as typeof import('clamav.js');
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('scanFile', () => {
    it('should scan file successfully when clean', async () => {
      const fileBuffer = Buffer.from('test content');
      const fileName = 'test.pdf';

      (service as unknown as { scanner: { scan: jest.Mock } }).scanner = mockScanner;
      mockScanner.scan.mockImplementation((_stream, callback) => {
        callback(null, null, false);
      });

      await expect(service.scanFile(fileBuffer, fileName)).resolves.not.toThrow();
    });

    it('should throw BadRequestException when virus detected', async () => {
      const fileBuffer = Buffer.from('malicious content');
      const fileName = 'malicious.pdf';

      mockScanner.scan.mockImplementation((_stream, callback) => {
        callback(null, 'EICAR-Test-File', true);
      });

      await expect(service.scanFile(fileBuffer, fileName)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when scanner error and failOnError is true', async () => {
      const fileBuffer = Buffer.from('test content');
      const fileName = 'test.pdf';

      mockScanner.scan.mockImplementation((_stream, callback) => {
        callback(new Error('Scanner error'), null, false);
      });

      await expect(service.scanFile(fileBuffer, fileName)).rejects.toThrow(BadRequestException);
    });

    it('should allow file when scanner error and failOnError is false', async () => {
      const failOnErrorConfigValues: Record<string, string> = {
        ...defaultConfigValues,
        ANTIVIRUS_FAIL_ON_ERROR: 'false',
      };

      const failOnErrorFalseConfig = {
        get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
          return failOnErrorConfigValues[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AntivirusService,
          {
            provide: ConfigService,
            useValue: failOnErrorFalseConfig,
          },
        ],
      }).compile();

      const serviceWithFailOnErrorFalse = module.get<AntivirusService>(AntivirusService);
      const fileBuffer = Buffer.from('test content');
      const fileName = 'test.pdf';

      const testScanner = {
        scan: jest.fn((_stream, callback) => {
          callback(new Error('Scanner error'), null, false);
        }),
      };
      (serviceWithFailOnErrorFalse as unknown as { scanner: { scan: jest.Mock } }).scanner =
        testScanner;

      await expect(
        serviceWithFailOnErrorFalse.scanFile(fileBuffer, fileName)
      ).resolves.not.toThrow();
    });

    it('should skip scanning when disabled', async () => {
      const disabledConfigValues: Record<string, string> = {
        ...defaultConfigValues,
        ANTIVIRUS_ENABLED: 'false',
      };

      mockConfigService.get.mockImplementation((key: string) => {
        return disabledConfigValues[key] ?? 'localhost';
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AntivirusService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const disabledService = module.get<AntivirusService>(AntivirusService);
      const fileBuffer = Buffer.from('test content');
      const fileName = 'test.pdf';

      await expect(disabledService.scanFile(fileBuffer, fileName)).resolves.not.toThrow();
    });

    it('should throw BadRequestException when scanner not initialized', async () => {
      const configWithEnabled = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'ANTIVIRUS_ENABLED') return 'true';
          if (key === 'CLAMAV_HOST') return 'localhost';
          if (key === 'CLAMAV_PORT') return '3310';
          return null;
        }),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AntivirusService,
          {
            provide: ConfigService,
            useValue: configWithEnabled,
          },
        ],
      }).compile();

      const serviceWithoutScanner = module.get<AntivirusService>(AntivirusService);
      (serviceWithoutScanner as unknown as { enabled: boolean; scanner: null }).enabled = true;
      (serviceWithoutScanner as unknown as { enabled: boolean; scanner: null }).scanner = null;
      const fileBuffer = Buffer.from('test content');
      const fileName = 'test.pdf';

      await expect(serviceWithoutScanner.scanFile(fileBuffer, fileName)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('isHealthy', () => {
    it('should return true when disabled', async () => {
      const disabledConfigValues: Record<string, string> = {
        ...defaultConfigValues,
        ANTIVIRUS_ENABLED: 'false',
      };

      mockConfigService.get.mockImplementation((key: string) => {
        return disabledConfigValues[key] ?? 'localhost';
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AntivirusService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const disabledService = module.get<AntivirusService>(AntivirusService);

      const result = await disabledService.isHealthy();

      expect(result).toBe(true);
    });

    it('should return true when ping succeeds', async () => {
      mockPing.mockImplementation((_port, _host, callback) => {
        callback(null);
      });

      const result = await service.isHealthy();

      expect(result).toBe(true);
    });

    it('should return false when ping fails', async () => {
      (
        service as unknown as {
          enabled: boolean;
          scanner: { scan: jest.Mock };
          clamavModule: { ping: jest.Mock };
        }
      ).enabled = true;
      (
        service as unknown as {
          enabled: boolean;
          scanner: { scan: jest.Mock };
          clamavModule: { ping: jest.Mock };
        }
      ).scanner = mockScanner;
      (
        service as unknown as {
          enabled: boolean;
          scanner: { scan: jest.Mock };
          clamavModule: { ping: jest.Mock };
        }
      ).clamavModule = { ping: mockPing } as unknown as typeof import('clamav.js');
      mockPing.mockImplementation((_port, _host, callback) => {
        setTimeout(() => callback(new Error('Connection failed')), 0);
      });

      const result = await service.isHealthy();

      expect(result).toBe(false);
      expect(mockPing).toHaveBeenCalled();
    });

    it('should return false when scanner not initialized', async () => {
      const configWithEnabled = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'ANTIVIRUS_ENABLED') return 'true';
          if (key === 'CLAMAV_HOST') return 'localhost';
          if (key === 'CLAMAV_PORT') return '3310';
          return null;
        }),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AntivirusService,
          {
            provide: ConfigService,
            useValue: configWithEnabled,
          },
        ],
      }).compile();

      const serviceWithoutScanner = module.get<AntivirusService>(AntivirusService);
      (
        serviceWithoutScanner as unknown as {
          enabled: boolean;
          scanner: null;
          clamavModule: null;
        }
      ).enabled = true;
      (
        serviceWithoutScanner as unknown as {
          enabled: boolean;
          scanner: null;
          clamavModule: null;
        }
      ).scanner = null;
      (
        serviceWithoutScanner as unknown as {
          enabled: boolean;
          scanner: null;
          clamavModule: null;
        }
      ).clamavModule = null;

      const result = await serviceWithoutScanner.isHealthy();

      expect(result).toBe(false);
    });
  });
});

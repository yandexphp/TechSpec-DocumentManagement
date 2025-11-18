import { Test, type TestingModule } from '@nestjs/testing';

import { FileConverterService } from '../file-converter.service';

jest.mock('node:fs/promises');
jest.mock('node:child_process', () => ({
  exec: jest.fn(),
}));

describe('FileConverterService', () => {
  let service: FileConverterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileConverterService],
    }).compile();

    service = module.get<FileConverterService>(FileConverterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isConvertible', () => {
    it('should return true for convertible formats', () => {
      expect(
        service.isConvertible(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
      ).toBe(true);
      expect(
        service.isConvertible('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      ).toBe(true);
      expect(service.isConvertible('application/msword')).toBe(true);
      expect(service.isConvertible('text/plain')).toBe(true);
      expect(service.isConvertible('text/csv')).toBe(true);
    });

    it('should return false for non-convertible formats', () => {
      expect(service.isConvertible('application/pdf')).toBe(false);
      expect(service.isConvertible('image/png')).toBe(false);
      expect(service.isConvertible('application/json')).toBe(false);
    });
  });
});

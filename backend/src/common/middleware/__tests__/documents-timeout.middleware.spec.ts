import { Test, type TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';

import { DocumentsTimeoutMiddleware } from '../documents-timeout.middleware';

describe('DocumentsTimeoutMiddleware', () => {
  let middleware: DocumentsTimeoutMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentsTimeoutMiddleware],
    }).compile();

    middleware = module.get<DocumentsTimeoutMiddleware>(DocumentsTimeoutMiddleware);

    mockRequest = {};
    mockResponse = {
      setTimeout: jest.fn(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('use', () => {
    it('should set request timeout to 0', () => {
      mockRequest.setTimeout = jest.fn();

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.setTimeout).toHaveBeenCalledWith(0);
      expect(mockResponse.setTimeout).toHaveBeenCalledWith(0);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set response timeout to 0', () => {
      mockRequest.setTimeout = jest.fn();

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setTimeout).toHaveBeenCalledWith(0);
    });

    it('should call next function', () => {
      mockRequest.setTimeout = jest.fn();

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});

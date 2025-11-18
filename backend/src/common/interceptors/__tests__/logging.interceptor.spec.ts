import { type CallHandler, type ExecutionContext, HttpException, Logger } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { of, throwError } from 'rxjs';

import { LoggingInterceptor } from '../logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: Partial<ExecutionContext>;
  let mockCallHandler: Partial<CallHandler>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingInterceptor],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);

    mockRequest = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
      },
    };

    mockResponse = {
      statusCode: 200,
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as never;

    mockCallHandler = {
      handle: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should log successful request', (done) => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of({ data: 'test' }));

      const result = interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler
      );

      result.subscribe({
        next: () => {
          expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('GET /test 200'));
          done();
        },
      });
    });

    it('should log request duration', (done) => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of({ data: 'test' }));

      const result = interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler
      );

      result.subscribe({
        next: () => {
          expect(loggerSpy).toHaveBeenCalledWith(expect.stringMatching(/\d+ms/));
          done();
        },
      });
    });

    it('should log error request', (done) => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      const error = new HttpException('Test error', 400);
      (mockCallHandler.handle as jest.Mock).mockReturnValue(throwError(() => error));

      const result = interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler
      );

      result.subscribe({
        error: () => {
          expect(loggerSpy).toHaveBeenCalledWith(
            expect.stringContaining('GET /test 400'),
            expect.any(String)
          );
          done();
        },
      });
    });

    it('should log request with user agent', (done) => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of({ data: 'test' }));

      const result = interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler
      );

      result.subscribe({
        next: () => {
          expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('test-agent'));
          done();
        },
      });
    });

    it('should handle missing user agent', (done) => {
      mockRequest.headers = {};
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of({ data: 'test' }));

      const result = interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler
      );

      result.subscribe({
        next: () => {
          expect(loggerSpy).toHaveBeenCalled();
          done();
        },
      });
    });
  });
});

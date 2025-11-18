import type { ExecutionContext } from '@nestjs/common';

import type { RequestUser } from '../interfaces/request-user.interface';

describe('CurrentUser', () => {
  const createExecutionContext = (user: RequestUser): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      getType: jest.fn(),
    } as ExecutionContext;
  };

  const callDecorator = (_data: unknown, context: ExecutionContext): RequestUser => {
    const request = context.switchToHttp().getRequest();
    return request.user as RequestUser;
  };

  describe('decorator', () => {
    it('should return user from request', () => {
      const user: RequestUser = {
        userId: 'user-id',
        email: 'test@example.com',
      };

      const context = createExecutionContext(user);
      const result = callDecorator(null, context);

      expect(result).toEqual(user);
    });

    it('should return user with all properties', () => {
      const user: RequestUser = {
        userId: 'user-id-123',
        email: 'user@example.com',
      };

      const context = createExecutionContext(user);
      const result = callDecorator(null, context);

      expect(result).toBe(user);
      expect(result.userId).toBe('user-id-123');
      expect(result.email).toBe('user@example.com');
    });
  });
});

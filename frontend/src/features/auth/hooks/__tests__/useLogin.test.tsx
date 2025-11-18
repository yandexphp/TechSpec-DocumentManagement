import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BroadcastEventType } from '../../../../entities/broadcast/model/types';
import type { LoginDto } from '../../../../entities/user/model/types';
import { showToast } from '../../../../shared/lib/toast';
import { broadcastService } from '../../../../shared/services/broadcast.service';
import { websocketService } from '../../../../shared/services/websocket.service';
import { authApi } from '../../api/authApi';
import { useLogin } from '../useLogin';

vi.mock('../../api/authApi');
vi.mock('../../../../shared/services/broadcast.service');
vi.mock('../../../../shared/services/websocket.service');
vi.mock('../../../../shared/lib/toast');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('useLogin', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: React.ReactNode }) => {
      const rootRoute = createRootRoute({
        component: () => children,
      });
      const indexRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/',
        component: () => null,
      });
      const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute]) });

      return (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      );
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should login successfully', async () => {
    const loginDto: LoginDto = { email: 'test@example.com', password: 'password123' };
    const mockResponse = {
      userId: 'user-123',
      email: 'test@example.com',
      nickname: 'testuser',
      avatarUrl: null,
    };

    (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    result.current.mutate(loginDto);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(authApi.login).toHaveBeenCalledWith(loginDto);
    expect(broadcastService.broadcast).toHaveBeenCalledWith(BroadcastEventType.AUTH_LOGIN);
    expect(websocketService.connect).toHaveBeenCalled();
    expect(showToast.success).toHaveBeenCalled();
  });

  it('should handle login error', async () => {
    const loginDto: LoginDto = { email: 'test@example.com', password: 'wrong' };

    (authApi.login as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    result.current.mutate(loginDto);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(showToast.error).toHaveBeenCalled();
  });
});

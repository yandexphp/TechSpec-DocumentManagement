import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BroadcastEventType } from '../../../../entities/broadcast/model/types';
import { showToast } from '../../../../shared/lib/toast';
import { broadcastService } from '../../../../shared/services/broadcast.service';
import { websocketService } from '../../../../shared/services/websocket.service';
import { authApi } from '../../api/authApi';
import { useLogout } from '../useLogout';

vi.mock('../../api/authApi');
vi.mock('../../../../shared/services/broadcast.service');
vi.mock('../../../../shared/services/websocket.service');
vi.mock('../../../../shared/lib/toast');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('useLogout', () => {
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

  it('should logout successfully', async () => {
    (authApi.logout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(authApi.logout).toHaveBeenCalled();
    expect(broadcastService.broadcast).toHaveBeenCalledWith(BroadcastEventType.AUTH_LOGOUT);
    expect(websocketService.disconnect).toHaveBeenCalled();
    expect(showToast.success).toHaveBeenCalled();
  });

  it('should handle logout error', async () => {
    (authApi.logout as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Logout failed'));

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(broadcastService.broadcast).toHaveBeenCalledWith(BroadcastEventType.AUTH_LOGOUT);
    expect(websocketService.disconnect).toHaveBeenCalled();
    expect(showToast.error).toHaveBeenCalled();
  });
});

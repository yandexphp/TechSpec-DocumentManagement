import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UpdateProfileDto } from '../../../../entities/user/model/types';
import { showToast } from '../../../../shared/lib/toast';
import { authApi } from '../../api/authApi';
import { useUpdateProfile } from '../useUpdateProfile';

vi.mock('../../api/authApi');
vi.mock('../../../../shared/lib/toast');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('useUpdateProfile', () => {
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

  it('should update profile successfully', async () => {
    const updateDto: UpdateProfileDto = { nickname: 'newuser' };
    const mockResponse = {
      userId: 'user-123',
      email: 'test@example.com',
      nickname: 'newuser',
      avatarUrl: null,
    };

    (authApi.updateProfile as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    result.current.mutate(updateDto);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(authApi.updateProfile).toHaveBeenCalledWith(updateDto);
    expect(showToast.success).toHaveBeenCalled();
  });

  it('should handle update profile error', async () => {
    const updateDto: UpdateProfileDto = { nickname: 'newuser' };

    (authApi.updateProfile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Update failed')
    );

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    result.current.mutate(updateDto);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(showToast.error).toHaveBeenCalled();
  });
});

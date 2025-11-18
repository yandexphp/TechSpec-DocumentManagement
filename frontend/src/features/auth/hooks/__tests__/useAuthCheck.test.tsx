import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authMeQueryFn } from '../authQueryFn';
import { useAuthCheck } from '../useAuthCheck';

vi.mock('../../api/authApi');
vi.mock('../authQueryFn', () => ({
  authMeQueryFn: vi.fn(),
}));

describe('useAuthCheck', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch user data', async () => {
    const mockUser = {
      userId: 'user-123',
      email: 'test@example.com',
      nickname: 'testuser',
      avatarUrl: null,
    };

    (authMeQueryFn as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuthCheck(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockUser);
  });

  it('should handle error when user is not authenticated', async () => {
    (authMeQueryFn as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useAuthCheck(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

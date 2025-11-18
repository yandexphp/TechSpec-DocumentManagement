import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authApi } from '../../api/authApi';
import { useCheckNickname } from '../useCheckNickname';

vi.mock('../../api/authApi');

describe('useCheckNickname', () => {
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

  it('should check nickname availability when enabled and valid length', async () => {
    (authApi.checkNickname as ReturnType<typeof vi.fn>).mockResolvedValue({ available: true });

    const { result } = renderHook(() => useCheckNickname('testuser', true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(authApi.checkNickname).toHaveBeenCalledWith('testuser');
    expect(result.current.data).toEqual({ available: true });
  });

  it('should not check when disabled', () => {
    renderHook(() => useCheckNickname('testuser', false), {
      wrapper: createWrapper(),
    });

    expect(authApi.checkNickname).not.toHaveBeenCalled();
  });

  it('should not check when nickname is too short', () => {
    renderHook(() => useCheckNickname('ab', true), {
      wrapper: createWrapper(),
    });

    expect(authApi.checkNickname).not.toHaveBeenCalled();
  });

  it('should not check when nickname is too long', () => {
    const longNickname = 'a'.repeat(31);
    renderHook(() => useCheckNickname(longNickname, true), {
      wrapper: createWrapper(),
    });

    expect(authApi.checkNickname).not.toHaveBeenCalled();
  });
});

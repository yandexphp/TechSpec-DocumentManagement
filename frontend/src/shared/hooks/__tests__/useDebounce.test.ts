import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 300));
    expect(result.current).toBe('test');
  });

  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'test', delay: 300 },
    });

    expect(result.current).toBe('test');

    act(() => {
      rerender({ value: 'updated', delay: 300 });
    });
    expect(result.current).toBe('test');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('updated');
  });

  it('should handle multiple rapid changes', async () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'a', delay: 300 },
    });

    act(() => {
      rerender({ value: 'b', delay: 300 });
      rerender({ value: 'c', delay: 300 });
      rerender({ value: 'd', delay: 300 });
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('d');
  });

  it('should clear timeout on unmount', () => {
    const { unmount } = renderHook(() => useDebounce('test', 300));
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    act(() => {
      unmount();
    });
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});

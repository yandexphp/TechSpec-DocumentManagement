import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useI18nStore } from '../i18n.store';

describe('i18nStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with default language', () => {
    const { result } = renderHook(() => useI18nStore());
    expect(['ru', 'en', 'kz']).toContain(result.current.language);
  });

  it('should initialize with language from localStorage', () => {
    localStorage.setItem('locale', 'en');
    const { result } = renderHook(() => useI18nStore());
    expect(result.current.language).toBe('en');
  });

  it('should set language to ru', () => {
    const { result } = renderHook(() => useI18nStore());

    act(() => {
      result.current.setLanguage('ru');
    });

    expect(result.current.language).toBe('ru');
    expect(localStorage.getItem('locale')).toBe('ru');
  });

  it('should set language to en', () => {
    const { result } = renderHook(() => useI18nStore());

    act(() => {
      result.current.setLanguage('en');
    });

    expect(result.current.language).toBe('en');
    expect(localStorage.getItem('locale')).toBe('en');
  });

  it('should set language to kz', () => {
    const { result } = renderHook(() => useI18nStore());

    act(() => {
      result.current.setLanguage('kz');
    });

    expect(result.current.language).toBe('kz');
    expect(localStorage.getItem('locale')).toBe('kz');
  });

  it('should persist language to localStorage', () => {
    const { result } = renderHook(() => useI18nStore());

    act(() => {
      result.current.setLanguage('en');
    });

    expect(localStorage.getItem('locale')).toBe('en');
  });
});

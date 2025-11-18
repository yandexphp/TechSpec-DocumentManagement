import { useQuery } from '@tanstack/react-query';

import { authMeQueryFn } from './authQueryFn';

export const useAuthCheck = () => {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authMeQueryFn,
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: typeof window !== 'undefined' && window.location.pathname !== '/login',
  });
};

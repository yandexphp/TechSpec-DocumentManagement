import { createFileRoute, redirect } from '@tanstack/react-router';

import { authMeQueryFn } from '../features/auth/hooks/authQueryFn';
import { ROUTES } from '../shared/config/routes';
import { queryClient } from '../shared/lib/queryClient';

export const Route = createFileRoute(ROUTES.ROOT)({
  beforeLoad: async () => {
    const cachedUser = queryClient.getQueryData(['auth', 'me']);
    if (cachedUser) {
      throw redirect({
        to: ROUTES.DOCUMENTS,
      });
    }

    try {
      await queryClient.fetchQuery({
        queryKey: ['auth', 'me'],
        queryFn: authMeQueryFn,
        retry: false,
        staleTime: 5 * 60 * 1000,
      });
      throw redirect({
        to: ROUTES.DOCUMENTS,
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'to' in error) {
        throw error;
      }
      throw redirect({
        to: ROUTES.LOGIN,
      });
    }
  },
});

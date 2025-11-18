import { createFileRoute, redirect } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

import { authMeQueryFn } from '../features/auth/hooks/authQueryFn';
import { ROUTES } from '../shared/config/routes';
import { queryClient } from '../shared/lib/queryClient';
import { LoginPageSkeleton } from '../shared/ui/LoginPageSkeleton';

const LoginPage = lazy(() =>
  import('../pages/login/ui/LoginPage').then((module) => ({ default: module.default }))
);

export const Route = createFileRoute(ROUTES.LOGIN)({
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
    }
  },
  component: () => (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginPage />
    </Suspense>
  ),
});

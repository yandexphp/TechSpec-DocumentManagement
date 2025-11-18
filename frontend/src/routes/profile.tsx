import { createFileRoute, redirect } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

import { authMeQueryFn } from '../features/auth/hooks/authQueryFn';
import { ROUTES } from '../shared/config/routes';
import { queryClient } from '../shared/lib/queryClient';
import { LoginPageSkeleton } from '../shared/ui/LoginPageSkeleton';

const ProfilePage = lazy(() =>
  import('../pages/profile/ui/ProfilePage').then((module) => ({ default: module.default }))
);

export const Route = createFileRoute(ROUTES.PROFILE)({
  beforeLoad: async () => {
    try {
      await queryClient.fetchQuery({
        queryKey: ['auth', 'me'],
        queryFn: authMeQueryFn,
        retry: false,
      });
    } catch {
      throw redirect({
        to: ROUTES.LOGIN,
      });
    }
  },
  component: () => (
    <Suspense fallback={<LoginPageSkeleton />}>
      <ProfilePage />
    </Suspense>
  ),
});

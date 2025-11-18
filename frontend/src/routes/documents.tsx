import { createFileRoute, redirect } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

import { authMeQueryFn } from '../features/auth/hooks/authQueryFn';
import { ROUTES } from '../shared/config/routes';
import { queryClient } from '../shared/lib/queryClient';
import { DocumentsPageSkeleton } from '../shared/ui/DocumentsPageSkeleton';

const DocumentsPage = lazy(() =>
  import('../pages/documents/ui/DocumentsPage').then((module) => ({ default: module.default }))
);

export const Route = createFileRoute(ROUTES.DOCUMENTS)({
  validateSearch: (
    search: Record<string, unknown>
  ): { name?: string; page?: number; limit?: number; onlyMine?: boolean } => {
    return {
      name: typeof search.name === 'string' ? search.name : undefined,
      page:
        typeof search.page === 'number'
          ? search.page
          : typeof search.page === 'string'
            ? Number.parseInt(search.page, 10)
            : undefined,
      limit:
        typeof search.limit === 'number'
          ? search.limit
          : typeof search.limit === 'string'
            ? Number.parseInt(search.limit, 10)
            : undefined,
      onlyMine:
        typeof search.onlyMine === 'boolean'
          ? search.onlyMine
          : typeof search.onlyMine === 'string'
            ? search.onlyMine === 'true'
            : undefined,
    };
  },
  beforeLoad: async () => {
    const cachedUser = queryClient.getQueryData(['auth', 'me']);
    if (cachedUser) {
      return;
    }

    try {
      await queryClient.fetchQuery({
        queryKey: ['auth', 'me'],
        queryFn: authMeQueryFn,
        retry: false,
        staleTime: 5 * 60 * 1000,
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
  component: () => (
    <Suspense fallback={<DocumentsPageSkeleton />}>
      <DocumentsPage />
    </Suspense>
  ),
});

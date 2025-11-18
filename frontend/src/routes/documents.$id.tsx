import { createFileRoute, redirect } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

import { authMeQueryFn } from '../features/auth/hooks/authQueryFn';
import { ROUTES } from '../shared/config/routes';
import { queryClient } from '../shared/lib/queryClient';
import { ViewDocumentPageSkeleton } from '../shared/ui/ViewDocumentPageSkeleton';

const ViewDocumentPage = lazy(() =>
  import('../pages/document-view/ui/ViewDocumentPage').then((module) => ({
    default: module.default,
  }))
);

export const Route = createFileRoute(ROUTES.DOCUMENT_VIEW)({
  beforeLoad: async () => {
    try {
      await queryClient.fetchQuery({
        queryKey: ['auth', 'me'],
        queryFn: authMeQueryFn,
        retry: false,
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
  component: () => {
    const { id } = Route.useParams();
    return (
      <Suspense fallback={<ViewDocumentPageSkeleton />}>
        <ViewDocumentPage id={id} />
      </Suspense>
    );
  },
});

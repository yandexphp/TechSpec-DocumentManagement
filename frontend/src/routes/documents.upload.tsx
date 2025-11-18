import { createFileRoute, redirect } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

import { authMeQueryFn } from '../features/auth/hooks/authQueryFn';
import { ROUTES } from '../shared/config/routes';
import { queryClient } from '../shared/lib/queryClient';
import { UploadDocumentPageSkeleton } from '../shared/ui/UploadDocumentPageSkeleton';

const UploadDocumentPage = lazy(() =>
  import('../pages/documents-upload/ui/UploadDocumentPage').then((module) => ({
    default: module.default,
  }))
);

export const Route = createFileRoute(ROUTES.DOCUMENT_UPLOAD)({
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
  component: () => (
    <Suspense fallback={<UploadDocumentPageSkeleton />}>
      <UploadDocumentPage />
    </Suspense>
  ),
});

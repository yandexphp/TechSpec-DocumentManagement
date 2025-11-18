import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { lazy, type ReactNode, Suspense } from 'react';
import type { ToastContainerProps } from 'react-toastify';

import { AuthProvider } from '../../features/auth/model/authContext';
import { queryClient } from '../../shared/lib/queryClient';
import { ErrorBoundary } from '../../shared/ui/ErrorBoundary';
import { ThemeProvider } from '../../shared/ui/ThemeProvider';
import { UploadProgressIndicator } from '../../widgets/upload-progress/ui/UploadProgressIndicator';

const ToastContainer = lazy(() =>
  import('react-toastify').then((module) => {
    import('../../shared/config/toast.css');
    return { default: module.ToastContainer as React.ComponentType<ToastContainerProps> };
  })
);

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
          <Suspense fallback={null}>
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick={true}
              rtl={false}
              pauseOnFocusLoss={true}
              draggable={true}
              pauseOnHover={true}
              theme="colored"
              toastClassName="custom-toast"
            />
          </Suspense>
        </ThemeProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        <UploadProgressIndicator />
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

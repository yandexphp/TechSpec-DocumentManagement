import { createRouter, RouterProvider } from '@tanstack/react-router';

import { routeTree } from '../routeTree.gen';
import { queryClient } from '../shared/lib/queryClient';

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export const Router = () => <RouterProvider router={router} />;

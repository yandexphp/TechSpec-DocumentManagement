import { Box, Container, Paper, Skeleton } from '@mui/material';

import { cn } from '../lib/utils';

export const LoginPageSkeleton = () => {
  return (
    <Container maxWidth="sm">
      <Box className={cn('min-h-screen flex items-center justify-center')}>
        <Paper elevation={3} className={cn('p-8 w-full')}>
          <Skeleton variant="text" width="60%" height={48} className={cn('mb-6 mx-auto')} />
          <Box className={cn('mb-6')}>
            <Skeleton variant="rectangular" width="50%" height={48} />
          </Box>
          <Skeleton variant="rectangular" width="100%" height={56} className={cn('mb-4')} />
          <Skeleton variant="rectangular" width="100%" height={56} className={cn('mb-6')} />
          <Skeleton variant="rectangular" width="100%" height={40} />
        </Paper>
      </Box>
    </Container>
  );
};

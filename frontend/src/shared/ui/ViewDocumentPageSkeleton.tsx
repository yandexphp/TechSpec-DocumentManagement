import { Box, Container, Paper, Skeleton } from '@mui/material';

import { cn } from '../lib/utils';

export const ViewDocumentPageSkeleton = () => {
  return (
    <Container maxWidth="lg" className={cn('mt-8 mb-8')}>
      <Box className={cn('flex items-center mb-6')}>
        <Skeleton variant="circular" width={40} height={40} className={cn('mr-4')} />
        <Skeleton variant="text" width="40%" height={40} className={cn('flex-grow')} />
        <Skeleton variant="circular" width={40} height={40} className={cn('ml-4')} />
      </Box>

      <Paper className={cn('p-4 mb-4')}>
        <Skeleton variant="text" width="60%" height={24} />
      </Paper>

      <Paper className={cn('p-8 min-h-[600px] flex items-center justify-center')}>
        <Skeleton variant="rectangular" width="80%" height={500} />
      </Paper>
    </Container>
  );
};

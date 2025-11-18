import { Box, Container, Paper, Skeleton } from '@mui/material';

import { cn } from '../lib/utils';

export const DocumentsPageSkeleton = () => {
  return (
    <Container maxWidth="lg" className={cn('mt-8 mb-8')}>
      <Box className={cn('flex justify-between items-center mb-6')}>
        <Skeleton variant="text" width={200} height={40} />
        <Box className={cn('flex items-center gap-2')}>
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton variant="rectangular" width={180} height={36} className={cn('mr-2')} />
          <Skeleton variant="circular" width={40} height={40} />
        </Box>
      </Box>

      <Paper className={cn('p-4 mb-4')}>
        <Box className={cn('flex gap-4')}>
          <Skeleton variant="rectangular" width="100%" height={56} />
          <Skeleton variant="rectangular" width={120} height={56} />
        </Box>
      </Paper>

      <Paper className={cn('p-4')}>
        <Skeleton variant="rectangular" width="100%" height={50} className={cn('mb-2')} />
        <Skeleton variant="rectangular" width="100%" height={50} className={cn('mb-2')} />
        <Skeleton variant="rectangular" width="100%" height={50} className={cn('mb-2')} />
        <Skeleton variant="rectangular" width="100%" height={50} className={cn('mb-2')} />
        <Skeleton variant="rectangular" width="100%" height={50} />
      </Paper>
    </Container>
  );
};

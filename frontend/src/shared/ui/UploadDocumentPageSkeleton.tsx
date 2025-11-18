import { Box, Container, Paper, Skeleton } from '@mui/material';

import { cn } from '../lib/utils';

export const UploadDocumentPageSkeleton = () => {
  return (
    <Container maxWidth="md" className={cn('mt-8 mb-8')}>
      <Box className={cn('flex items-center mb-6')}>
        <Skeleton variant="circular" width={40} height={40} className={cn('mr-4')} />
        <Skeleton variant="text" width={200} height={40} />
      </Box>

      <Paper className={cn('p-8')}>
        <Box className={cn('border-2 border-dashed rounded-lg p-8 text-center mb-6')}>
          <Skeleton variant="circular" width={80} height={80} className={cn('mx-auto mb-4')} />
          <Skeleton variant="text" width="50%" height={32} className={cn('mx-auto mb-2')} />
          <Skeleton variant="text" width="70%" height={24} className={cn('mx-auto mb-4')} />
          <Skeleton variant="rectangular" width={150} height={36} className={cn('mx-auto')} />
        </Box>

        <Skeleton variant="rectangular" width="100%" height={56} />
      </Paper>
    </Container>
  );
};

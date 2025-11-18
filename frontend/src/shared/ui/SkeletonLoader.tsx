import { Box, Paper, Skeleton } from '@mui/material';

import { cn } from '../lib/utils';

interface SkeletonLoaderProps {
  variant?: 'page' | 'table' | 'form' | 'document';
  className?: string;
}

export const SkeletonLoader = ({ variant = 'page', className }: SkeletonLoaderProps) => {
  if (variant === 'page') {
    return (
      <Box className={cn('p-8', className)}>
        <Skeleton variant="text" width="40%" height={40} className={cn('mb-4')} />
        <Skeleton variant="rectangular" width="100%" height={200} className={cn('mb-4')} />
        <Skeleton variant="rectangular" width="100%" height={200} />
      </Box>
    );
  }

  if (variant === 'table') {
    return (
      <Paper className={cn('p-4', className)}>
        <Skeleton variant="text" width="30%" height={32} className={cn('mb-4')} />
        <Skeleton variant="rectangular" width="100%" height={50} className={cn('mb-2')} />
        <Skeleton variant="rectangular" width="100%" height={50} className={cn('mb-2')} />
        <Skeleton variant="rectangular" width="100%" height={50} className={cn('mb-2')} />
        <Skeleton variant="rectangular" width="100%" height={50} className={cn('mb-2')} />
        <Skeleton variant="rectangular" width="100%" height={50} />
      </Paper>
    );
  }

  if (variant === 'form') {
    return (
      <Paper className={cn('p-8', className)}>
        <Skeleton variant="text" width="50%" height={40} className={cn('mb-6')} />
        <Skeleton variant="rectangular" width="100%" height={56} className={cn('mb-4')} />
        <Skeleton variant="rectangular" width="100%" height={56} className={cn('mb-4')} />
        <Skeleton variant="rectangular" width="100%" height={40} />
      </Paper>
    );
  }

  if (variant === 'document') {
    return (
      <Box className={cn('p-8', className)}>
        <Box className={cn('flex items-center mb-6')}>
          <Skeleton variant="circular" width={40} height={40} className={cn('mr-4')} />
          <Skeleton variant="text" width="40%" height={40} />
        </Box>
        <Paper className={cn('p-4 mb-4')}>
          <Skeleton variant="text" width="60%" height={24} />
        </Paper>
        <Paper className={cn('p-8 min-h-[600px] flex items-center justify-center')}>
          <Skeleton variant="rectangular" width="80%" height={500} />
        </Paper>
      </Box>
    );
  }

  return null;
};

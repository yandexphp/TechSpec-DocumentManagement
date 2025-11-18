import { Box, Skeleton } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '../lib/utils';

interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'auto' | 'sync';
  onLoad?: () => void;
  onError?: () => void;
  sizes?: string;
  srcSet?: string;
  quality?: number;
  referrerPolicy?:
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url';
}

export const Image = ({
  src,
  alt,
  width,
  height,
  className,
  objectFit = 'contain',
  priority = false,
  loading = 'lazy',
  decoding = 'async',
  onLoad,
  onError,
  sizes,
  srcSet,
  quality = 85,
  referrerPolicy = 'strict-origin-when-cross-origin',
}: ImageProps) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const defaultSizes = sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px';
  const defaultSrcSet = useMemo(() => {
    if (srcSet) return srcSet;
    return undefined;
  }, [srcSet]);

  const imageSrc = useMemo(() => {
    if (width || height || quality !== 85) {
      try {
        const url = src.startsWith('http') ? new URL(src) : new URL(src, window.location.origin);
        if (width) url.searchParams.set('width', width.toString());
        if (height) url.searchParams.set('height', height.toString());
        if (quality !== 85) url.searchParams.set('quality', quality.toString());
        return url.toString();
      } catch {
        return src;
      }
    }
    return src;
  }, [src, width, height, quality]);

  useEffect(() => {
    if (imgRef.current?.complete) {
      setIsLoading(false);
    }
  }, []);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <Box
        className={cn('flex items-center justify-center bg-gray-200 text-gray-500', className)}
        sx={{ width, height, minHeight: height ? undefined : 200 }}
        role="img"
        aria-label={alt || t('Изображение не загружено')}
      >
        <Box component="span" className={cn('text-sm')}>
          {alt || t('Изображение не загружено')}
        </Box>
      </Box>
    );
  }

  return (
    <Box className={cn('relative', className)} sx={{ width, height }}>
      {isLoading && (
        <Skeleton
          variant="rectangular"
          width={width || '100%'}
          height={height || '100%'}
          className={cn('absolute inset-0')}
          aria-hidden="true"
        />
      )}
      <Box
        component="img"
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        loading={priority ? 'eager' : loading}
        decoding={decoding}
        fetchPriority={priority ? 'high' : 'auto'}
        sizes={defaultSizes}
        srcSet={defaultSrcSet || undefined}
        referrerPolicy={referrerPolicy}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'fill' && 'object-fill',
          objectFit === 'none' && 'object-none',
          objectFit === 'scale-down' && 'object-scale-down'
        )}
        style={{
          width: width ? `${width}px` : '100%',
          height: height ? `${height}px` : 'auto',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      />
    </Box>
  );
};

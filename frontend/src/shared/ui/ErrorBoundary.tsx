import { Alert, Box, Button, Container, Typography } from '@mui/material';
import i18n from 'i18next';
import { Component, type ReactNode } from 'react';

import { ROUTES } from '../config/routes';
import { cn } from '../lib/utils';
import type { TNullable } from '../types/nullable';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: TNullable<Error>;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = ROUTES.ROOT;
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Container maxWidth="md" className={cn('mt-8 mb-8')}>
          <Alert severity="error" className={cn('mb-4')}>
            <Typography variant="h6" component="h2" className={cn('mb-2')}>
              {i18n.t('Произошла ошибка')}
            </Typography>
            <Typography variant="body2" className={cn('mb-4')}>
              {this.state.error?.message || i18n.t('Неизвестная ошибка')}
            </Typography>
            <Box className={cn('flex gap-2')}>
              <Button variant="contained" onClick={this.handleReset}>
                {i18n.t('Вернуться на главную')}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
              >
                {i18n.t('Попробовать снова')}
              </Button>
            </Box>
          </Alert>
        </Container>
      );
    }

    return this.props.children;
  }
}

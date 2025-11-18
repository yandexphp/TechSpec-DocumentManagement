import i18n from 'i18next';

interface ErrorWithResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface ErrorWithMessage {
  message?: string;
}

interface ErrorWithError {
  error?: string;
}

function isErrorWithResponse(error: unknown): error is ErrorWithResponse {
  return typeof error === 'object' && error !== null && 'response' in error;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return typeof error === 'object' && error !== null && 'message' in error;
}

function isErrorWithError(error: unknown): error is ErrorWithError {
  return typeof error === 'object' && error !== null && 'error' in error;
}

export const getErrorMessage = (error: unknown): string => {
  if (isErrorWithMessage(error) && typeof error.message === 'string') {
    return error.message;
  }
  if (isErrorWithError(error) && typeof error.error === 'string') {
    return error.error;
  }
  if (isErrorWithResponse(error)) {
    const response = error.response;
    if (response?.data?.message && typeof response.data.message === 'string') {
      return response.data.message;
    }
  }
  return i18n.t('Произошла ошибка');
};

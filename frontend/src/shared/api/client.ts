import axios from 'axios';

import { API_URL } from '../config/constants';
import { ROUTES } from '../config/routes';
import type { TNullable } from '../types/nullable';

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface QueuedRequest {
  resolve: (value?: undefined) => void;
  reject: (reason?: Error) => void;
}

let isRefreshing = false;
let failedQueue: QueuedRequest[] = [];

const processQueue = (error: TNullable<Error> = null): void => {
  failedQueue.forEach((prom) => {
    error ? prom.reject(error) : prom.resolve();
  });
  failedQueue = [];
};

const queueRequest = (originalRequest: Parameters<typeof apiClient>[0]): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  })
    .then(() => apiClient(originalRequest))
    .catch((err) => Promise.reject(err));
};

const refreshToken = async (): Promise<void> => {
  await apiClient.post('/auth/refresh');
};

const redirectToLogin = (): void => {
  if (window.location.pathname === ROUTES.LOGIN) {
    return;
  }
  setTimeout(() => {
    window.location.href = ROUTES.LOGIN;
  }, 100);
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';

    if (
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return queueRequest(originalRequest);
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await refreshToken();
      processQueue(null);
      isRefreshing = false;
      return apiClient(originalRequest);
    } catch (refreshError) {
      isRefreshing = false;
      const error = refreshError instanceof Error ? refreshError : new Error(String(refreshError));
      processQueue(error);
      failedQueue = [];
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  }
);

export default apiClient;

import { authApi } from '../api/authApi';

export const authMeQueryFn = () => authApi.me();

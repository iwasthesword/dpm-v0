import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add admin auth token
adminApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const adminToken = localStorage.getItem('adminAccessToken');
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
adminApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('adminRefreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || '/api'}/admin/auth/refresh`,
          { refreshToken }
        );

        const newAccessToken = response.data.accessToken;
        localStorage.setItem('adminAccessToken', newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return adminApi(originalRequest);
      } catch (refreshError) {
        // Clear admin tokens and redirect to admin login
        localStorage.removeItem('adminAccessToken');
        localStorage.removeItem('adminRefreshToken');
        window.location.href = '/admin/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export function adminLogout() {
  localStorage.removeItem('adminAccessToken');
  localStorage.removeItem('adminRefreshToken');
  window.location.href = '/admin/login';
}

export default adminApi;

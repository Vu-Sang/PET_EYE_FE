import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token to headers
apiClient.interceptors.request.use(
  (config) => {
    // Skip token for public endpoints to avoid 401 from expired tokens
    const publicEndpoints = ['/auth/login', '/shops/register', '/files/upload', '/users/register'];
    const isPublic = publicEndpoints.some(endpoint => config.url?.includes(endpoint));

    if (!isPublic) {
      const userStr = localStorage.getItem('Peteye_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const pathname = window.location.pathname;
    const isAuthPage = pathname.includes('/login') || pathname.includes('/register');
    // Also skip redirect if the request itself was to an auth endpoint
    const requestUrl = error.config?.url ?? '';
    const isAuthRequest = requestUrl.includes('/auth/');

    const hasUser = !!localStorage.getItem('Peteye_user');

    if (error.response?.status === 401 && !isAuthPage && !isAuthRequest && hasUser) {
      localStorage.removeItem('Peteye_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;


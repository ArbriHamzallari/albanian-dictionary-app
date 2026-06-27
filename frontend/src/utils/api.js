import axios from 'axios';

// Auth is cookie-based (httpOnly JWT). The browser sends the session cookie
// automatically with credentials: 'include'. The token is never read/written in
// JS (XSS cannot exfiltrate it).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

const CSRF_COOKIE = 'fjalingo_csrf';
const CSRF_HEADER = 'x-fjalingo-csrf';
const STATE_CHANGING = new Set(['post', 'put', 'patch', 'delete']);

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// The API and frontend live on different registrable domains in production, so
// JS here cannot read the API's CSRF cookie via document.cookie. The backend
// returns the token in auth response bodies (login/register/refresh/me); we keep
// it here (persisted so it survives a reload until /me refreshes it) and echo it
// in the x-fjalingo-csrf header. The cookie is still sent to the API
// cross-site (SameSite=None) for the double-submit comparison.
const CSRF_STORAGE_KEY = 'fjalingo_csrf_token';
let csrfToken = localStorage.getItem(CSRF_STORAGE_KEY) || null;
function setCsrfToken(token) {
  csrfToken = token || null;
  if (token) localStorage.setItem(CSRF_STORAGE_KEY, token);
  else localStorage.removeItem(CSRF_STORAGE_KEY);
}

// Echo the CSRF token in a custom header on state-changing requests
// (double-submit pattern). Prefer the stored token (cross-domain); fall back to
// the cookie for same-host setups like local dev.
api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  if (STATE_CHANGING.has(method)) {
    const csrf = csrfToken || readCookie(CSRF_COOKIE);
    if (csrf) config.headers[CSRF_HEADER] = csrf;
  }
  return config;
});

// On a 401, try a one-shot token refresh and replay the original request.
let refreshing = null;
api.interceptors.response.use(
  (response) => {
    // Auth endpoints return a fresh CSRF token; keep it for subsequent writes.
    if (response.data && response.data.csrfToken) {
      setCsrfToken(response.data.csrfToken);
    }
    return response;
  },
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthCall = original?.url?.includes('/auth/login')
      || original?.url?.includes('/auth/refresh')
      || original?.url?.includes('/auth/register');

    if (status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      try {
        refreshing = refreshing || api.post('/auth/refresh');
        await refreshing;
        refreshing = null;
        return api(original);
      } catch (refreshErr) {
        refreshing = null;
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

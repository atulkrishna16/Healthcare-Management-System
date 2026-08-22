import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 30000,
  withCredentials: true,
});

// ── Request interceptor: attach access token ───────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && token !== 'mock-access-token') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401, refresh token via httpOnly cookie ───
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Avoid infinite loop on auth endpoints
    if (original.url?.includes('/auth/login') || original.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const { accessToken } = res.data;
        if (accessToken) {
          localStorage.setItem('accessToken', accessToken);
          original.headers.Authorization = `Bearer ${accessToken}`;
          return api(original);
        }
      } catch {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  getGoogleAuthUrl: () => api.get('/auth/google'),
};

// ── Doctors ────────────────────────────────────────────────────────────────
export const doctorsApi = {
  search: (params) => {
    const query = typeof params === 'string' ? (params === 'All' ? {} : { specialisation: params }) : params;
    return api.get('/doctors', { params: query });
  },
  get: (id) => api.get(`/doctors/${id}`),
  getSlots: (doctorId, date) => api.get(`/doctors/${doctorId}/slots`, { params: { date } }),
  getOwnSchedule: () => api.get('/doctors/me/schedule'),
  updateOwnSchedule: (data) => api.put('/doctors/me/schedule', data),
  addOwnLeave: (data) => api.post('/doctors/me/leave', data),
  deleteOwnLeave: (id) => api.delete(`/doctors/me/leave/${id}`),
};

// ── Appointments ───────────────────────────────────────────────────────────
export const appointmentsApi = {
  list: () => api.get('/appointments'),
  get: (id) => api.get(`/appointments/${id}`),
  hold: (data) => api.post('/appointments/hold', data),
  submitSymptoms: (id, data) => api.post(`/appointments/${id}/symptoms`, data),
  confirm: (id) => api.post(`/appointments/${id}/confirm`),
  cancel: (id) => api.post(`/appointments/${id}/cancel`),
  reschedule: (id, data) => api.post(`/appointments/${id}/reschedule`, data),
  submitNotes: (id, data) => api.post(`/appointments/${id}/notes`, data),
};

// ── Google Calendar OAuth2 ────────────────────────────────────────────────
export const googleCalendarApi = {
  getConnectUrl: () => api.get('/calendar/google/connect'),
  getStatus: () => api.get('/calendar/google/status'),
  disconnect: () => api.post('/calendar/google/disconnect'),
};

// ── Admin ──────────────────────────────────────────────────────────────────
export const adminApi = {
  stats: () => api.get('/admin/stats'),
  getStats: () => api.get('/admin/stats'),
  getDoctors: () => api.get('/admin/doctors'),
  createDoctor: (data) => api.post('/admin/doctors', data),
  updateDoctor: (id, data) => api.patch(`/admin/doctors/${id}`, data),
  deleteDoctor: (id) => api.delete(`/admin/doctors/${id}`),
  getDoctorSchedule: (id) => api.get(`/admin/doctors/${id}/schedule`),
  updateDoctorSchedule: (id, data) => api.put(`/admin/doctors/${id}/schedule`, data),
  getDoctorLeave: (id) => api.get(`/admin/doctors/${id}/leave`),
  addLeave: (id, data) => api.post(`/admin/doctors/${id}/leave`, data),
  deleteLeave: (doctorId, leaveId) => api.delete(`/admin/doctors/${doctorId}/leave/${leaveId}`),
  getNotifications: (params) => api.get('/admin/notifications', { params }),
  retryNotification: (id) => api.post(`/admin/notifications/${id}/retry`),
  listAdmins: () => api.get('/admin/admins'),
  createAdmin: (data) => api.post('/admin/admins', data),
  checkHealth: () => api.get('/admin/health-check'),
};

export default api;

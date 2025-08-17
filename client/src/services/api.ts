import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';
const USER_ROLE = import.meta.env.VITE_USER_ROLE || 'reports-viewer';
const USERNAME = import.meta.env.VITE_USERNAME || 'user';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-User-Role': USER_ROLE,
    'X-Username': USERNAME,
  },
});

// Indices API
export const indicesAPI = {
  list: () => api.get('/indices'),
  getMapping: (index: string) => api.get(`/indices/${index}/mapping`),
  getFieldCaps: (indices: string[]) => api.post('/field-caps', { indices }),
};

// DataPoints API
export const dataPointsAPI = {
  list: () => api.get('/datapoints'),
  get: (id: string) => api.get(`/datapoints/${id}`),
  create: (data: any) => api.post('/datapoints', data),
  update: (id: string, data: any) => api.put(`/datapoints/${id}`, data),
  delete: (id: string) => api.delete(`/datapoints/${id}`),
  run: (id: string, params?: any) => api.post(`/datapoints/${id}/run`, params || {}),
  export: (id: string, params?: any) => api.post(`/datapoints/${id}/export`, params || {}, {
    responseType: 'blob',
  }),
};

// Dashboards API
export const dashboardsAPI = {
  list: () => api.get('/dashboards'),
  get: (id: string) => api.get(`/dashboards/${id}`),
  create: (data: any) => api.post('/dashboards', data),
  update: (id: string, data: any) => api.put(`/dashboards/${id}`, data),
  delete: (id: string) => api.delete(`/dashboards/${id}`),
  run: (id: string, params?: any) => api.post(`/dashboards/${id}/run`, params || {}),
  export: (id: string, params?: any) => api.post(`/dashboards/${id}/export`, params || {}, {
    responseType: 'blob',
  }),
};

export default api;
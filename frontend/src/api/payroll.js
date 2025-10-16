import axios from 'axios';

export function createPayrollClient(getToken) {
  const client = axios.create({ baseURL: '/api/payroll' });
  client.interceptors.request.use((config) => {
    const token = getToken?.();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return {
    list: (params) => client.get('/', { params }).then(r => r.data),
    get: (id) => client.get(`/${id}`).then(r => r.data),
    create: (payload) => client.post('/', payload).then(r => r.data),
    update: (id, payload) => client.put(`/${id}`, payload).then(r => r.data),
    remove: (id) => client.delete(`/${id}`).then(r => r.data),
  };
}

import axios from 'axios';

export function createRecruitmentClient(getToken) {
  const client = axios.create({ baseURL: '/api/recruitment' });
  client.interceptors.request.use((config) => {
    const token = getToken?.();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return {
    screen: (payload) => client.post('/screen', payload).then(r => r.data),
    converse: (payload) => client.post('/converse', payload).then(r => r.data),
  };
}

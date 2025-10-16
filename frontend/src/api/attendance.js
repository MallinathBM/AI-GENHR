import axios from 'axios';
import dayjs from 'dayjs';

export function createAttendanceClient(getToken) {
  const client = axios.create({ baseURL: '/api/attendance' });
  client.interceptors.request.use((config) => {
    const token = getToken?.();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return {
    clockIn: (payload) => client.post('/clock-in', payload).then(r => r.data),
    clockOut: (payload) => client.post('/clock-out', payload).then(r => r.data),
    list: (params) => client.get('/', { params }).then(r => r.data),
    summary: (params) => client.get('/summary', { params }).then(r => r.data),
    todayRange: () => ({ from: dayjs().format('YYYY-MM-DD'), to: dayjs().format('YYYY-MM-DD') }),
    thisMonthRange: () => ({ from: dayjs().startOf('month').format('YYYY-MM-DD'), to: dayjs().endOf('month').format('YYYY-MM-DD') })
  };
}

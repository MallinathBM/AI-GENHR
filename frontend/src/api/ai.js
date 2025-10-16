import axios from 'axios';

export function createAIClient(getToken) {
  const client = axios.create({ baseURL: '/api/ai' });
  client.interceptors.request.use((config) => {
    const token = getToken?.();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return {
    skillsGap: (payload) => client.post('/skills/gap', payload).then(r => r.data),
    attendanceAnomalies: (params) => client.get('/attendance/anomalies', { params }).then(r => r.data),
    performanceInsights: (payload) => client.post('/performance/insights', payload).then(r => r.data),
    payrollForecast: (payload) => client.post('/payroll/forecast', payload).then(r => r.data),
    candidatesRank: (payload) => client.post('/candidates/rank', payload).then(r => r.data),
    resumeAnalyze: ({ file, jd, keywords }) => {
      const form = new FormData();
      if (file) form.append('file', file);
      if (jd) form.append('jd', jd);
      if (keywords) form.append('keywords', keywords);
      // Do not set Content-Type manually; let axios set the boundary
      return client.post('/resume/analyze', form).then(r => r.data);
    },
    resumeImprove: ({ text, jd, keywords }) => client.post('/resume/improve', { text, jd, keywords }).then(r => r.data),
  };
}

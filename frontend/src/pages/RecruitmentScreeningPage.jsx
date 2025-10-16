import React, { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { createRecruitmentClient } from '../api/recruitment';

export default function RecruitmentScreeningPage() {
  const { token } = useAuth();
  const api = useMemo(() => createRecruitmentClient(() => token), [token]);

  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [skills, setSkills] = useState('react,node,express,mongo');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleScreen(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { resumeText, jobDescription, skills: skills.split(',').map(s=>s.trim()).filter(Boolean) };
      const data = await api.screen(payload);
      setResult(data);
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Screen failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Resume Screening (AI)</h1>
      <form onSubmit={handleScreen} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label> Resume Text
          <textarea rows={10} value={resumeText} onChange={(e)=>setResumeText(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>
        <label> Job Description
          <textarea rows={10} value={jobDescription} onChange={(e)=>setJobDescription(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>
        <label> Skills (comma separated)
          <input value={skills} onChange={(e)=>setSkills(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>
        <div style={{ alignSelf: 'end' }}>
          <button disabled={loading} type="submit" style={{ padding: '8px 12px' }}>{loading ? 'Scoring...' : 'Screen'}</button>
        </div>
      </form>

      {result && (
        <div style={{ marginTop: 16, border: '1px solid #eee', padding: 12, borderRadius: 6 }}>
          <h3 style={{ marginTop: 0 }}>Result</h3>
          <p><strong>Skills Score:</strong> {result.scores?.skills}%</p>
          <p><strong>JD Match:</strong> {result.scores?.jobDescription}%</p>
          <p><strong>Composite:</strong> {result.scores?.composite}%</p>
          <p><strong>Matched Skills:</strong> {(result.details?.matchedSkills || []).join(', ') || '-'}</p>
          <p><strong>Missing Skills:</strong> {(result.details?.missingSkills || []).join(', ') || '-'}</p>
        </div>
      )}
    </div>
  );
}

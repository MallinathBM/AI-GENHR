import React, { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { createAIClient } from '../api/ai';

export default function AIToolsPage() {
  const { token } = useAuth();
  const api = useMemo(() => createAIClient(() => token), [token]);

  const [skillsInput, setSkillsInput] = useState({ employeeSkills: 'react,node', roleSkills: 'react,node,express', catalog: 'React Guide|https://react.dev,Node Course|https://nodejs.dev' });
  const [skillsResult, setSkillsResult] = useState(null);

  const [perfInput, setPerfInput] = useState({ goals: 'Goal A|1|60,Goal B|2|80', comments: 'Some delays but good collaboration.' });
  const [perfResult, setPerfResult] = useState(null);

  const [attParams, setAttParams] = useState({ employeeId: '', from: '', to: '' });
  const [attResult, setAttResult] = useState(null);

  const [payInput, setPayInput] = useState({ base: 1000, additions: '200,50', deductions: '100', months: 6 });
  const [payResult, setPayResult] = useState(null);

  const [rankJD, setRankJD] = useState('We need a React and Node.js developer with REST and MongoDB experience.');
  const [rankCandidates, setRankCandidates] = useState('Alice|alice@example.com|+15550009901|react,node,rest,mongodb|5y FE at X\nBob|bob@example.com|+15550009902|java,spring,sql|Backend at Y');
  const [rankResult, setRankResult] = useState(null);
  const [atsFile, setAtsFile] = useState(null);
  const [atsJD, setAtsJD] = useState('React/Node developer with REST and MongoDB');
  const [atsKW, setAtsKW] = useState('react,node,rest,mongodb');
  const [atsResult, setAtsResult] = useState(null);
  const [atsErr, setAtsErr] = useState('');
  const [improve, setImprove] = useState({ suggestions: [], improvedText: '' });

  async function runSkillsGap(e) {
    e.preventDefault();
    const employeeSkills = (skillsInput.employeeSkills || '').split(',').map(n => ({ name: n.trim() })).filter(s => s.name);
    const roleSkills = (skillsInput.roleSkills || '').split(',').map(n => n.trim()).filter(Boolean);
    const catalog = (skillsInput.catalog || '').split(',').map(s => ({ name: s.split('|')[0]?.trim(), url: s.split('|')[1]?.trim() })).filter(c => c.name);
    const data = await api.skillsGap({ employeeSkills, roleSkills, catalog });
    setSkillsResult(data);
  }

  async function runATS(e) {
    e.preventDefault();
    setAtsErr(''); setImprove({ suggestions: [], improvedText: '' });
    if (!atsFile) { setAtsErr('Please choose a resume file'); return; }
    try {
      const data = await api.resumeAnalyze({ file: atsFile, jd: atsJD, keywords: atsKW });
      setAtsResult(data);
    } catch (err) {
      setAtsErr(err?.response?.data?.message || err.message || 'Analyze failed');
    }
  }

  async function runPerfInsights(e) {
    e.preventDefault();
    const goals = (perfInput.goals || '').split(',').map(x => {
      const [title, weight, score] = x.split('|');
      return { title: (title || '').trim(), weight: Number(weight || 0), score: Number(score || 0) };
    }).filter(g => g.title);
    const data = await api.performanceInsights({ goals, comments: perfInput.comments || '' });
    setPerfResult(data);
  }

  async function runAttAnomalies(e) {
    e.preventDefault();
    const data = await api.attendanceAnomalies(attParams);
    setAttResult(data);
  }

  async function runPayrollForecast(e) {
    e.preventDefault();
    const additions = String(payInput.additions || '').split(',').map(a => ({ amount: Number(a || 0) })).filter(a => a.amount);
    const deductions = String(payInput.deductions || '').split(',').map(a => ({ amount: Number(a || 0) })).filter(a => a.amount);
    const data = await api.payrollForecast({ base: Number(payInput.base || 0), additions, deductions, months: Number(payInput.months || 12) });
    setPayResult(data);
  }

  async function runCandidatesRank(e) {
    e.preventDefault();
    // Parse candidates: one per line -> name|email|phone|skill1,skill2|resumeSnippet
    const candidates = String(rankCandidates || '')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => {
        const [name, email, phone, skillsStr, resume] = l.split('|');
        const skills = (skillsStr || '')
          .split(',')
          .map(s => s.trim().toLowerCase())
          .filter(Boolean);
        return { name: name?.trim(), email: email?.trim(), phone: phone?.trim(), skills, resume: resume?.trim() };
      })
      .filter(c => c.name && (c.email || c.phone));
    const data = await api.candidatesRank({ jd: rankJD, candidates });
    setRankResult(data);
  }

  return (
    <div>
      <h1>AI Tools</h1>

      <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <h3>Skill Gap & Learning Paths</h3>
        <form onSubmit={runSkillsGap} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <label> Employee Skills (comma)
            <input value={skillsInput.employeeSkills} onChange={(e)=>setSkillsInput(v=>({ ...v, employeeSkills: e.target.value }))} />
          </label>
          <label> Role Skills (comma)
            <input value={skillsInput.roleSkills} onChange={(e)=>setSkillsInput(v=>({ ...v, roleSkills: e.target.value }))} />
          </label>
          <label> Catalog (name|url, comma)
            <input value={skillsInput.catalog} onChange={(e)=>setSkillsInput(v=>({ ...v, catalog: e.target.value }))} />
          </label>
          <div style={{ alignSelf: 'end' }}>
            <button type="submit">Run</button>
          </div>
        </form>
        {skillsResult && (
          <div style={{ marginTop: 12 }}>
            <p><strong>Gaps:</strong> {(skillsResult.gaps || []).join(', ') || '-'}</p>
            <div>
              <strong>Suggestions</strong>
              <ul>
                {(skillsResult.suggestions || []).map((s, i) => (
                  <li key={i}>{s.skill}: {(s.courses || []).map(c => <a key={c.url} href={c.url} target="_blank" rel="noreferrer">{c.name}</a> )}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <h3>Resume ATS Analysis</h3>
        <form onSubmit={runATS} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label> Resume (PDF or DOCX)
            <input type="file" accept="application/pdf,.docx" onChange={(e)=>setAtsFile(e.target.files?.[0] || null)} />
          </label>
          <label> Target JD (optional)
            <textarea rows={4} value={atsJD} onChange={(e)=>setAtsJD(e.target.value)} />
          </label>
          <label> Keywords (comma)
            <input value={atsKW} onChange={(e)=>setAtsKW(e.target.value)} />
          </label>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit">Analyze</button>
            <button type="button" className="btn-secondary" onClick={()=>{ setAtsResult(null); setImprove({ suggestions: [], improvedText: '' }); setAtsFile(null); setAtsErr(''); }}>Re-upload</button>
          </div>
        </form>
        {atsErr ? <div style={{ color: 'crimson', marginTop: 8 }}>{atsErr}</div> : null}
        {atsResult && (
          <div style={{ marginTop: 12 }}>
            <p><strong>ATS Score:</strong> {atsResult.score} {typeof atsResult.finalScore === 'number' ? `· Final Score: ${atsResult.finalScore}` : ''} {typeof atsResult.jdFit === 'number' ? `· JD Fit: ${atsResult.jdFit}%` : ''}</p>
            <div style={{ background: 'rgba(148,163,184,0.2)', height: 10, borderRadius: 6, overflow: 'hidden', margin: '8px 0 12px' }}>
              <div style={{ width: `${Math.min(100, Math.max(0, Number(atsResult.score||0)))}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)' }} />
            </div>
            <p>
              <strong>Keyword Match:</strong>
              {' '}
              {(() => {
                const matched = (atsResult.matchedKeywords || []).length;
                const total = Number(atsResult.totalKeywords || 0) || matched || 1;
                const pct = Math.round((matched / total) * 100);
                return `${matched}/${total} (${pct}%)`;
              })()}
            </p>
            <p><strong>Matched Keywords:</strong> {(atsResult.matchedKeywords || []).join(', ') || '-'}</p>
            <p><strong>Missing Keywords:</strong> {(atsResult.missingKeywords || []).join(', ') || '-'}</p>
            <div>
              <strong>Sections</strong>
              <ul>
                <li>Skills: {atsResult.sections?.skills ? 'Yes' : 'No'}</li>
                <li>Experience: {atsResult.sections?.experience ? 'Yes' : 'No'}</li>
                <li>Education: {atsResult.sections?.education ? 'Yes' : 'No'}</li>
                <li>Contact: {atsResult.sections?.contact ? 'Yes' : 'No'}</li>
              </ul>
            </div>
            <div>
              <strong>Formatting</strong>
              <p>Bullets: {atsResult.formatting?.bullets} | Headings: {atsResult.formatting?.headings} | Pages: {atsResult.formatting?.pagesApprox}</p>
            </div>
            <div>
              <strong>Feedback</strong>
              <ul>
                {(atsResult.feedback || []).map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>

            {/* Contact & Detected Skills */}
            {(atsResult.contact || atsResult.detectedSkills) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                <div>
                  <strong>Contact</strong>
                  <p><em>Name:</em> {atsResult.contact?.name || '-'}</p>
                  <p><em>Emails:</em> {(atsResult.contact?.emails || []).join(', ') || '-'}</p>
                  <p><em>Phones:</em> {(atsResult.contact?.phones || []).join(', ') || '-'}</p>
                </div>
                <div>
                  <strong>Detected Skills</strong>
                  <p>{(atsResult.detectedSkills || []).join(', ') || '-'}</p>
                </div>
              </div>
            )}

            {/* Parsed Sections Preview */}
            {atsResult.parsedSections && (
              <div style={{ marginTop: 8 }}>
                <strong>Parsed Sections</strong>
                <details>
                  <summary>Skills</summary>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{atsResult.parsedSections.skills || '-'}</pre>
                </details>
                <details>
                  <summary>Experience</summary>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{atsResult.parsedSections.experience || '-'}</pre>
                </details>
                <details>
                  <summary>Education</summary>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{atsResult.parsedSections.education || '-'}</pre>
                </details>
              </div>
            )}

            {/* Export Report */}
            <div style={{ marginTop: 8 }}>
              <button type="button" className="btn-secondary" onClick={()=>{
                const report = {
                  jd: atsJD,
                  keywords: atsKW,
                  score: atsResult.score,
                  jdFit: atsResult.jdFit,
                  finalScore: atsResult.finalScore,
                  matchedKeywords: atsResult.matchedKeywords,
                  missingKeywords: atsResult.missingKeywords,
                  sections: atsResult.sections,
                  formatting: atsResult.formatting,
                  feedback: atsResult.feedback,
                  contact: atsResult.contact,
                  detectedSkills: atsResult.detectedSkills,
                  parsedSections: atsResult.parsedSections
                };
                const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'ats_report.json'; a.click();
                URL.revokeObjectURL(url);
              }}>Export Report (JSON)</button>
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={async ()=>{
                try {
                  const data = await api.resumeImprove({ text: atsResult.extractedText || '', jd: atsJD, keywords: atsKW });
                  setImprove(data || { suggestions: [], improvedText: '' });
                } catch (err) {
                  alert(err?.response?.data?.message || err.message || 'Failed to get suggestions');
                }
              }}>Get Improvement Suggestions</button>
              {improve.improvedText ? (
                <>
                  <button type="button" className="btn-secondary" onClick={()=>{
                    navigator.clipboard?.writeText(improve.improvedText);
                  }}>Copy Improved Resume</button>
                  <button type="button" className="btn-secondary" onClick={()=>{
                    const blob = new Blob([improve.improvedText], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'improved_resume.txt'; a.click();
                    URL.revokeObjectURL(url);
                  }}>Download Improved Resume</button>
                </>
              ) : null}
            </div>

            {improve.suggestions?.length ? (
              <div style={{ marginTop: 12 }}>
                <strong>Improvement Suggestions</strong>
                <ul>
                  {improve.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            ) : null}

            {improve.improvedText ? (
              <div style={{ marginTop: 12 }}>
                <strong>Improved Resume (Preview)</strong>
                <textarea rows={12} style={{ width: '100%' }} value={improve.improvedText} onChange={(e)=>setImprove(prev=>({ ...prev, improvedText: e.target.value }))} />
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <h3>Candidate Ranking</h3>
        <form onSubmit={runCandidatesRank} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label> Job Description
            <textarea rows={6} value={rankJD} onChange={(e)=>setRankJD(e.target.value)} />
          </label>
          <label> Candidates (one per line: name|email|phone|skills(comma)|resume)
            <textarea rows={6} value={rankCandidates} onChange={(e)=>setRankCandidates(e.target.value)} />
          </label>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit">Rank Candidates</button>
          </div>
        </form>
        {rankResult && (
          <div style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Score</th>
                  <th>Matched Skills</th>
                  <th>Missing Skills</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {(rankResult.ranked || []).map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{r.candidate?.name}</td>
                    <td>{r.score}</td>
                    <td>{(r.matchSkills || []).join(', ')}</td>
                    <td>{(r.missingSkills || []).join(', ')}</td>
                    <td>{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <h3>Performance Insights</h3>
        <form onSubmit={runPerfInsights} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <label> Goals (title|weight|score, comma)
            <input value={perfInput.goals} onChange={(e)=>setPerfInput(v=>({ ...v, goals: e.target.value }))} />
          </label>
          <label> Comments
            <input value={perfInput.comments} onChange={(e)=>setPerfInput(v=>({ ...v, comments: e.target.value }))} />
          </label>
          <div>
            <button type="submit">Analyze</button>
          </div>
        </form>
        {perfResult && (
          <div style={{ marginTop: 12 }}>
            <p><strong>Auto Score:</strong> {perfResult.autoScore}</p>
            <p><strong>Tips:</strong> {(perfResult.tips || []).join(' • ') || '-'}</p>
          </div>
        )}
      </section>

      <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <h3>Attendance Anomalies</h3>
        <form onSubmit={runAttAnomalies} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <label> Employee ID
            <input value={attParams.employeeId} onChange={(e)=>setAttParams(v=>({ ...v, employeeId: e.target.value }))} />
          </label>
          <label> From
            <input type="date" value={attParams.from} onChange={(e)=>setAttParams(v=>({ ...v, from: e.target.value }))} />
          </label>
          <label> To
            <input type="date" value={attParams.to} onChange={(e)=>setAttParams(v=>({ ...v, to: e.target.value }))} />
          </label>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit">Detect</button>
          </div>
        </form>
        {attResult && (
          <div style={{ marginTop: 12 }}>
            <p><strong>Late:</strong> {attResult.late} | <strong>Absent:</strong> {attResult.absent} | <strong>Risk:</strong> {attResult.risk}%</p>
          </div>
        )}
      </section>

      <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <h3>Payroll Forecast</h3>
        <form onSubmit={runPayrollForecast} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <label> Base
            <input type="number" value={payInput.base} onChange={(e)=>setPayInput(v=>({ ...v, base: e.target.value }))} />
          </label>
          <label> Additions (comma)
            <input value={payInput.additions} onChange={(e)=>setPayInput(v=>({ ...v, additions: e.target.value }))} />
          </label>
          <label> Deductions (comma)
            <input value={payInput.deductions} onChange={(e)=>setPayInput(v=>({ ...v, deductions: e.target.value }))} />
          </label>
          <label> Months
            <input type="number" value={payInput.months} onChange={(e)=>setPayInput(v=>({ ...v, months: e.target.value }))} />
          </label>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit">Forecast</button>
          </div>
        </form>
        {payResult && (
          <div style={{ marginTop: 12 }}>
            <p><strong>Monthly Net:</strong> {payResult.monthlyNet}</p>
            <p><strong>Total ({payInput.months} mo):</strong> {payResult.total}</p>
          </div>
        )}
      </section>
    </div>
  );
}

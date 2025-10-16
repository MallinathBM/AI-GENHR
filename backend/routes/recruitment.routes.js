const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// Helper: tokenize and score
function tokenize(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function termFreq(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  return tf;
}

function cosineSim(tfA, tfB) {
  const terms = new Set([...tfA.keys(), ...tfB.keys()]);
  let dot = 0, normA = 0, normB = 0;
  for (const k of terms) {
    const a = tfA.get(k) || 0;
    const b = tfB.get(k) || 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB) || 1;
  return dot / denom;
}

// POST /api/recruitment/screen
// body: { resumeText, jobDescription, skills: ["react","node"], weight?: {skills, jd} }
router.post('/screen', async (req, res) => {
  try {
    const { resumeText = '', jobDescription = '', skills = [], weight = {} } = req.body || {};
    if (!resumeText && !jobDescription && (!skills || skills.length === 0)) {
      return res.status(400).json({ message: 'Provide at least resumeText and jobDescription or skills' });
    }

    const resTokens = tokenize(resumeText);
    const jdTokens = tokenize(jobDescription);
    const tfRes = termFreq(resTokens);
    const tfJd = termFreq(jdTokens);
    const jdScore = Math.round(cosineSim(tfRes, tfJd) * 100);

    // skills score: percent of required skills found in resume
    const normalizedSkills = (skills || []).map((s) => s.toLowerCase().trim()).filter(Boolean);
    let found = 0;
    for (const s of normalizedSkills) {
      if (resumeText.toLowerCase().includes(s)) found += 1;
    }
    const skillsScore = normalizedSkills.length ? Math.round((found / normalizedSkills.length) * 100) : 0;

    const wSkills = Number(weight.skills ?? 0.6);
    const wJd = Number(weight.jd ?? 0.4);
    const composite = Math.round((skillsScore * wSkills + jdScore * wJd));

    return res.json({
      scores: {
        skills: skillsScore,
        jobDescription: jdScore,
        composite,
      },
      details: {
        matchedSkills: normalizedSkills.filter(s => resumeText.toLowerCase().includes(s)),
        missingSkills: normalizedSkills.filter(s => !resumeText.toLowerCase().includes(s)),
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/recruitment/converse
// body: { message }
router.post('/converse', async (req, res) => {
  try {
    const msg = String(req.body?.message || '').trim().toLowerCase();
    if (!msg) return res.status(400).json({ message: 'message is required' });

    let reply = "I'm here to help with recruitment. Could you clarify your question?";
    if (/hello|hi|hey/.test(msg)) reply = 'Hello! How can I help you with the hiring process?';
    else if (/status|application/.test(msg)) reply = 'Your application is under review. We will update you within 3-5 business days.';
    else if (/interview|schedule/.test(msg)) reply = 'Interviews are typically scheduled within a week after screening. Do you have any preferred time slots?';
    else if (/salary|ctc|compensation/.test(msg)) reply = 'Compensation is aligned with market standards and experience. What range are you targeting?';
    else if (/experience|years|exp/.test(msg)) reply = 'Please share your total years of experience and key technologies you have worked on.';
    else if (/next step|next steps|process/.test(msg)) reply = 'Next steps: resume screening → interview(s) → offer. Would you like to proceed to the screening?';

    return res.json({ reply });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

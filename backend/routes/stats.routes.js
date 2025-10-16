const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Payroll = require('../models/Payroll');
const Performance = require('../models/Performance');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const [users, employees, attendance, payroll, performance] = await Promise.all([
      User.countDocuments({}),
      Employee.countDocuments({}),
      Attendance.countDocuments({}),
      Payroll.countDocuments({}),
      Performance.countDocuments({}),
    ]);
    res.json({
      users,
      employees,
      attendance,
      payroll,
      performance,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/stats/trends -> last 30 days per-day counts for key collections
router.get('/trends', async (req, res) => {
  try {
    const { range = '30d', employeeId } = req.query;
    const days = Math.max(1, parseInt(String(range).replace(/\D/g, '')) || 30);
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));

    async function series(Model, dateField = 'createdAt', extraMatch = {}) {
      const pipeline = [
        { $match: { [dateField]: { $gte: since }, ...extraMatch } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}` } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ];
      const rows = await Model.aggregate(pipeline);
      // build complete date list
      const map = new Map(rows.map(r => [r._id, r.count]));
      const labels = [];
      const data = [];
      const d = new Date(since);
      for (let i = 0; i < days; i++) {
        const iso = d.toISOString().slice(0, 10);
        labels.push(iso);
        data.push(map.get(iso) || 0);
        d.setDate(d.getDate() + 1);
      }
      return { labels, data };
    }

    const matchByEmp = employeeId ? { employee: employeeId } : {};
    const [users, employees, attendance, payroll, performance] = await Promise.all([
      series(User, 'createdAt'),
      series(Employee, 'createdAt'),
      series(Attendance, 'createdAt', matchByEmp),
      series(Payroll, 'createdAt', matchByEmp),
      series(Performance, 'createdAt', matchByEmp),
    ]);
    res.json({ users, employees, attendance, payroll, performance });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Me KPIs (per-user)
router.get('/me', async (req, res) => {
  try {
    const meEmp = await Employee.findOne({ user: req.user.sub });
    if (!meEmp) return res.status(404).json({ message: 'Employee profile not found' });
    const [attendanceCount, latestPerf, latestPayroll] = await Promise.all([
      Attendance.countDocuments({ employee: meEmp._id }),
      Performance.findOne({ employee: meEmp._id }).sort({ 'reviewPeriod.startDate': -1 }).select('overallScore status reviewPeriod'),
      Payroll.findOne({ employee: meEmp._id }).sort({ 'payPeriod.startDate': -1 }).select('netSalary baseSalary payPeriod status'),
    ]);
    res.json({
      employeeId: meEmp._id,
      attendance: attendanceCount,
      performance: latestPerf ? latestPerf.overallScore : null,
      payroll: latestPayroll ? latestPayroll.netSalary : null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Me trends (per-user)
router.get('/me/trends', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const meEmp = await Employee.findOne({ user: req.user.sub });
    if (!meEmp) return res.status(404).json({ message: 'Employee profile not found' });
    req.query.employeeId = String(meEmp._id);
    return router.handle({ ...req, url: '/trends' }, res);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Company KPIs (admin only) – reuse existing aggregate counts, guarded
router.get('/company', requireRole('admin'), async (req, res, next) => {
  return router.handle({ ...req, url: '/' }, res, next);
});

// Company trends (admin only)
router.get('/company/trends', requireRole('admin'), async (req, res, next) => {
  return router.handle({ ...req, url: '/trends' }, res, next);
});

module.exports = router;

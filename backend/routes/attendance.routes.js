const express = require('express');
const dayjs = require('dayjs');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// all attendance routes require auth
router.use(authMiddleware);

// helper to get or resolve employee by current user
async function resolveEmployee(req) {
  if (req.body?.employeeId) {
    return await Employee.findById(req.body.employeeId);
  }
  return await Employee.findOne({ user: req.user.sub });
}

// POST /api/attendance/clock-in
router.post('/clock-in', async (req, res) => {
  try {
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(400).json({ message: 'Employee not found for user' });

    const today = dayjs().startOf('day').toDate();
    let record = await Attendance.findOne({ employee: employee._id, date: today });
    if (record && record.checkIn?.time) {
      return res.status(409).json({ message: 'Already clocked in today' });
    }
    if (!record) {
      record = new Attendance({ employee: employee._id, date: today });
    }
    record.checkIn = {
      time: new Date(),
      location: req.body?.location || undefined,
    };
    await record.save();
    // realtime
    try { const io = req.app.get('io'); io && io.emit('attendance:update', { employee: employee._id, action: 'clock-in', at: Date.now() }); } catch {}
    return res.status(201).json({ item: record });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/attendance/clock-out
router.post('/clock-out', async (req, res) => {
  try {
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(400).json({ message: 'Employee not found for user' });

    const today = dayjs().startOf('day').toDate();
    const record = await Attendance.findOne({ employee: employee._id, date: today });
    if (!record || !record.checkIn?.time) {
      return res.status(400).json({ message: 'Not clocked in yet' });
    }
    if (record.checkOut?.time) {
      return res.status(409).json({ message: 'Already clocked out today' });
    }
    record.checkOut = {
      time: new Date(),
      location: req.body?.location || undefined,
    };
    await record.save();
    // realtime
    try { const io = req.app.get('io'); io && io.emit('attendance:update', { employee: employee._id, action: 'clock-out', at: Date.now() }); } catch {}
    return res.json({ item: record });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/attendance -> list (self). Admin/manager/hr can pass employeeId
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, from, to, employeeId } = req.query;
    let empId = employeeId;
    if (!empId) {
      const self = await Employee.findOne({ user: req.user.sub });
      empId = self?._id;
    }
    if (!empId) return res.status(400).json({ message: 'Employee not found' });

    const filter = { employee: empId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = dayjs(from).startOf('day').toDate();
      if (to) filter.date.$lte = dayjs(to).startOf('day').toDate();
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Attendance.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit)),
      Attendance.countDocuments(filter),
    ]);
    return res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/attendance/summary -> totals hours and days in range
router.get('/summary', async (req, res) => {
  try {
    const { from, to, employeeId } = req.query;
    let empId = employeeId;
    if (!empId) {
      const self = await Employee.findOne({ user: req.user.sub });
      empId = self?._id;
    }
    if (!empId) return res.status(400).json({ message: 'Employee not found' });

    const filter = { employee: empId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = dayjs(from).startOf('day').toDate();
      if (to) filter.date.$lte = dayjs(to).startOf('day').toDate();
    }
    const recs = await Attendance.find(filter);
    const totalHours = recs.reduce((sum, r) => sum + (r.workHours || 0), 0);
    return res.json({ count: recs.length, totalHours: Math.round(totalHours * 100) / 100 });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

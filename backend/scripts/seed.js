require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Employee = require('../models/Employee');

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ai-hrms';
  console.log(`[seed] Connecting to ${uri} ...`);
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('[seed] Connected');

  const adminEmail = 'admin@example.com';
  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    console.log('[seed] Admin already exists:', existing.email);
  } else {
    const admin = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: adminEmail,
      password: 'admin123',
      role: 'admin',
      phone: '+10000000000'
    });
    await admin.save();
    console.log('[seed] Admin user created:', adminEmail, 'password: admin123');
  }

  // Create 100 demo users if they don't already exist
  const roles = ['employee', 'employee', 'employee', 'employee', 'employee', 'hr', 'manager'];
  let created = 0, skipped = 0;
  for (let i = 1; i <= 100; i++) {
    const email = `user${i}@example.com`;
    const phone = `+1555000${String(i).padStart(4, '0')}`;
    const exists = await User.findOne({ email });
    if (exists) { skipped++; continue; }
    const user = new User({
      firstName: 'User',
      lastName: String(i),
      email,
      password: 'Passw0rd!',
      role: roles[i % roles.length],
      phone
    });
    await user.save();
    created++;
  }
  console.log(`[seed] Demo users -> created: ${created}, skipped (already present): ${skipped}`);

  // Create matching Employees for demo users
  const depts = ['Support','Engineering','Sales','HR','Finance','Operations'];
  const positions = ['Associate','Engineer','Manager','Analyst','Coordinator'];
  let empCreated = 0, empSkipped = 0;
  for (let i = 1; i <= 100; i++) {
    const email = `user${i}@example.com`;
    const user = await User.findOne({ email });
    if (!user) continue;
    const employeeId = `E-${String(i).padStart(4,'0')}`;
    const existsEmp = await Employee.findOne({ $or: [{ user: user._id }, { employeeId }] });
    if (existsEmp) { empSkipped++; continue; }
    const joinDate = new Date(); joinDate.setDate(joinDate.getDate() - (i % 365));
    const salary = 40000 + (i % 20) * 1000;
    const emp = new Employee({
      user: user._id,
      employeeId,
      employmentDetails: {
        joinDate,
        department: depts[i % depts.length],
        position: positions[i % positions.length],
        employmentType: 'Full-time',
        workLocation: 'HQ',
        salary: { amount: salary, currency: 'USD' }
      },
      personalInfo: {
        phoneNumber: user.phone,
        address: { city: 'Metropolis', state: 'CA', country: 'USA' }
      },
      status: 'Active'
    });
    await emp.save();
    empCreated++;
  }
  console.log(`[seed] Demo employees -> created: ${empCreated}, skipped (already present): ${empSkipped}`);

  await mongoose.disconnect();
  console.log('[seed] Done.');
}

main().catch(err => {
  console.error('[seed] Error:', err);
  process.exitCode = 1;
}).finally(() => process.exit());

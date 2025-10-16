require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Employee = require('../models/Employee');

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ai-hrms';
  console.log(`[purge] Connecting to ${uri} ...`);
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('[purge] Connected');

  // Find demo users created by seed: user1@example.com ... user100@example.com
  const demoUsers = await User.find({ email: { $regex: /^user\d+@example\.com$/i } }).select('_id email');
  const userIds = demoUsers.map(u => u._id);
  console.log(`[purge] Demo users found: ${demoUsers.length}`);

  // Delete Employees linked to demo users
  let delByUser = 0;
  if (userIds.length > 0) {
    const res = await Employee.deleteMany({ user: { $in: userIds } });
    delByUser = res.deletedCount || 0;
    console.log(`[purge] Employees deleted by user link: ${delByUser}`);
  }

  // Extra safety: delete any E-0001 ... E-9999 pattern (in case some were created without linked user)
  const res2 = await Employee.deleteMany({ employeeId: { $regex: /^E-\d{4}$/ } });
  const delByPattern = (res2.deletedCount || 0);
  console.log(`[purge] Employees deleted by employeeId pattern: ${delByPattern}`);

  await mongoose.disconnect();
  console.log('[purge] Done.');
}

main().catch(err => {
  console.error('[purge] Error:', err);
  process.exitCode = 1;
}).finally(() => process.exit());

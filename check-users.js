const mongoose = require('mongoose');
const User = require('./models/User');

async function checkEmps() {
  try {
    await mongoose.connect('mongodb://localhost:27017/eazsocial');
    const emps = await User.find({}, 'name role isActive email');
    console.log('--- ALL USERS ---');
    console.log(JSON.stringify(emps, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkEmps();

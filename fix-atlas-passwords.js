// Run once: node fix-atlas-passwords.js
const bcrypt = require('./node_modules/bcryptjs');
const mongoose = require('./node_modules/mongoose');

mongoose.connect('mongodb+srv://halalAdmin:Halal2025@halal-supply-chain.ub8gdv1.mongodb.net/halal_supply_chain').then(async () => {
  const db = mongoose.connection.db;
  const users = [
    { email:'badmin@halal.com',        password:'Admin2025',        role:'ADMIN' },
    { email:'mahra@pafn.gov.kw',       password:'Authority2025',    role:'AUTHORITY' },
    { email:'khalid@kuwaitfoodco.com', password:'Manufacturer2025', role:'MANUFACTURER' },
    { email:'SaraKh2@gmail.com',       password:'Customer2025',     role:'CUSTOMER' },
  ];
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await db.collection('users').updateOne(
      { Email: u.email },
      { $set: { Password: hash, Role: u.role, Status: 'ACTIVE' } }
    );
    console.log('Fixed: ' + u.email);
  }
  await mongoose.disconnect();
  console.log('All done!');
});

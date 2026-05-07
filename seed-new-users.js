// Run this from inside the blockchain folder:
// node seed-new-users.js

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const MONGODB_URI = "mongodb://127.0.0.1:27017/halal_supply_chain";

const userSchema = new mongoose.Schema({
  _id: String,
  Name: String, Email: String, Password: String,
  Role: String, Status: String, Country: String,
  OrganizationName: String, ManufacturerID: String, CreatedAt: Date,
}, { collection:"users", versionKey:false });

const User = mongoose.model("User", userSchema);

const users = [
  { name:"Halal Admin",        email:"badmin@halal.com",          password:"Admin2025",        role:"ADMIN",        org:"HalalChain System" },
  { name:"Mahra Al-Rashidi",   email:"mahra@pafn.gov.kw",         password:"Authority2025",    role:"AUTHORITY",    org:"P.A.F.N. Kuwait" },
  { name:"Khalid Al-Mutawa",   email:"khalid@kuwaitfoodco.com",   password:"Manufacturer2025", role:"MANUFACTURER", org:"Kuwait Food Company" },
  { name:"Sara Khalid",        email:"SaraKh2@gmail.com",         password:"Customer2025",     role:"CUSTOMER",     org:"Customer" },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  for (const u of users) {
    const existing = await User.findOne({ Email: u.email });
    if (existing) {
      const hashed = await bcrypt.hash(u.password, 10);
      await User.findOneAndUpdate({ Email: u.email }, { Password: hashed, Name: u.name, Status:"ACTIVE" });
      console.log(`Updated: ${u.email}`);
    } else {
      const hashed = await bcrypt.hash(u.password, 10);
      await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        Name: u.name, Email: u.email, Password: hashed,
        Role: u.role, Status:"ACTIVE", Country:"Kuwait",
        OrganizationName: u.org, ManufacturerID: u.role === "MANUFACTURER" ? "KFC-001" : u.role,
        CreatedAt: new Date(),
      });
      console.log(`Created: ${u.email} (${u.role})`);
    }
  }

  console.log("\nDone! New credentials:");
  console.log("Admin:        badmin@halal.com / Admin2025");
  console.log("Authority:    mahra@pafn.gov.kw / Authority2025");
  console.log("Manufacturer: khalid@kuwaitfoodco.com / Manufacturer2025");
  console.log("Customer:     SaraKh2@gmail.com / Customer2025");

  await mongoose.disconnect();
}

seed().catch(console.error);

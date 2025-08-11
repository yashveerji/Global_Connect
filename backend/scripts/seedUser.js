const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");

dotenv.config();
connectDB();

const seedAdminUser = async () => {
  try {
    const existingAdmin = await User.findOne({ email: "admin@network.com" });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await User.create({
        name: "Admin User",
        email: "admin@network.com",
        password: hashedPassword,
        role: "admin",
      });
      console.log("✅ Admin user created");
    } else {
      console.log("🟡 Admin already exists");
    }

    const existingEmployer = await User.findOne({ email: "employer@network.com" });
    if (!existingEmployer) {
      const hashedPassword = await bcrypt.hash("employer123", 10);
      await User.create({
        name: "Employer User",
        email: "employer@network.com",
        password: hashedPassword,
        role: "employer",
      });
      console.log("✅ Employer user created");
    } else {
      console.log("🟡 Employer already exists");
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  }
};

seedAdminUser();

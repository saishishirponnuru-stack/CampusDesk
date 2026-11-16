import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Admin } from "../src/models/index.js";
export async function initAdmin({ email, password, name = "Administrator" }) {
  email = z.email().parse(email).toLowerCase();
  z.string().min(12).max(128).parse(password);
  const existing = await Admin.findOne({ email });
  if (existing) return existing;
  return Admin.create({
    email,
    name,
    passwordHash: await bcrypt.hash(password, 12),
  });
}
if (process.argv[1]?.endsWith("/admin.js")) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Admin.init();
    await initAdmin({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      name: process.env.ADMIN_NAME || "Administrator",
    });
    console.log(
      "Administrator exists; existing passwords are never overwritten.",
    );
  } finally {
    await mongoose.disconnect();
  }
}

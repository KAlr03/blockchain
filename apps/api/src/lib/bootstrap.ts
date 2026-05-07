import bcrypt from "bcryptjs";
import { env } from "@halal/config";
import { UserModel } from "../repositories/models/user.model.js";

export async function ensureBootstrapAdmin() {
  if (!env.BOOTSTRAP_ADMIN_EMAIL || !env.BOOTSTRAP_ADMIN_PASSWORD) {
    return;
  }

  const existing = await UserModel.findOne({ Email: env.BOOTSTRAP_ADMIN_EMAIL });
  if (existing) {
    return;
  }

  const password = await bcrypt.hash(env.BOOTSTRAP_ADMIN_PASSWORD, 10);

  await UserModel.create({
    Country: env.BOOTSTRAP_ADMIN_COUNTRY || "Kuwait",
    CreatedAt: new Date(),
    Email: env.BOOTSTRAP_ADMIN_EMAIL,
    ManufacturerID: "ADMIN-ROOT",
    Name: env.BOOTSTRAP_ADMIN_NAME || "Platform Admin",
    OrganizationName: env.BOOTSTRAP_ADMIN_ORGANIZATION || "Halal Supply Chain",
    Password: password,
    Role: "ADMIN",
    Status: "ACTIVE"
  });
}

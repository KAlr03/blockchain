import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "@halal/config";
import { createUser, findUserByEmail, findUserById } from "../repositories/user.repository.js";
import { toUserDto } from "../repositories/mappers/user.mapper.js";

export async function loginWithEmail(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }

  const validPassword = await bcrypt.compare(password, String(user.Password));
  if (!validPassword) return null;
  if (String(user.Status) === "PENDING_APPROVAL") {
    throw new Error("Your account is pending admin approval. Please wait for an administrator to activate your account.");
  }
  if (String(user.Status) !== "ACTIVE") {
    return null;
  }

  const token = jwt.sign(
    { role: String(user.Role), email: String(user.Email) },
    env.JWT_SECRET,
    { subject: String(user._id), expiresIn: "8h" }
  );

  return {
    token,
    user: toUserDto(user)
  };
}

export async function getAuthenticatedUser(userId: string) {
  const user = await findUserById(userId);
  return user ? toUserDto(user) : null;
}

export async function registerUser(input: {
  name: string;
  email: string;
  country: string;
  organizationName: string;
  manufacturerId: string;
  password: string;
  role: string;
  status: string;
}) {
  const hashedPassword = await bcrypt.hash(input.password, 10);
  return createUser({ ...input, password: hashedPassword });
}

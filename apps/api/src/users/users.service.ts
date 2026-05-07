import { updateUserSchema, createUserSchema } from "@halal/shared";
import bcrypt from "bcryptjs";
import { registerUser } from "../auth/auth.service.js";
import { listUsers, updateUser } from "../repositories/user.repository.js";

export async function createManagedUser(input: unknown) {
  const payload = createUserSchema.parse(input);
  return registerUser(payload);
}

export async function listManagedUsers() {
  return listUsers();
}

export async function updateManagedUser(id: string, input: unknown) {
  const payload = updateUserSchema.parse(input);
  if (payload.password) {
    payload.password = await bcrypt.hash(payload.password, 10);
  }
  return updateUser(id, payload);
}

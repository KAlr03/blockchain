import { asyncHandler } from "../lib/http.js";
import { createManagedUser, listManagedUsers, updateManagedUser } from "./users.service.js";
import { findUserById, updateUserById } from "../repositories/user.repository.js";
import bcrypt from "bcryptjs";

export const createUserController = asyncHandler(async (req, res) => {
  const user = await createManagedUser(req.body);
  return res.status(201).json(user);
});

export const listUsersController = asyncHandler(async (_req, res) => {
  const users = await listManagedUsers();
  return res.json(users);
});

export const updateUserController = asyncHandler(async (req, res) => {
  const user = await updateManagedUser(String(req.params.id), req.body);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }
  return res.json(user);
});

export const updateProfileController = asyncHandler(async (req, res) => {
  const userId = (req as any).auth?.userId;
  if (!userId) return res.status(401).json({ message: "Not authenticated." });
  const { name, email, password } = req.body;
  const updates: any = {};
  if (name) updates.Name = name;
  if (email) updates.Email = email;
  if (password) updates.Password = await bcrypt.hash(password, 10);
  const user = await findUserById(userId);
  if (!user) return res.status(404).json({ message: "User not found." });
  await updateUserById(userId, updates);
  return res.json({ message: "Profile updated successfully." });
});

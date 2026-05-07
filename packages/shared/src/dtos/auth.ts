import { z } from "zod";
import { USER_ROLES } from "../constants/roles.js";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  country: z.string().min(2),
  organizationName: z.string().min(2),
  manufacturerId: z.string().min(2),
  password: z.string().min(8),
  role: z.enum(USER_ROLES),
  status: z.string().default("ACTIVE"),
});

export const updateUserSchema = createUserSchema.partial().extend({
  status: z.string().optional(),
});

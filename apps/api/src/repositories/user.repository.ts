import { UserModel } from "./models/user.model.js";
import { toUserDto } from "./mappers/user.mapper.js";

export async function findUserByEmail(email: string) {
  return UserModel.findOne({ Email: email }).lean();
}

export async function findUserById(id: string) {
  return UserModel.findById(id).lean();
}

export async function listUsers() {
  const users = await UserModel.find().sort({ CreatedAt: -1 }).lean();
  return users.map((user) => toUserDto(user));
}

export async function createUser(input: {
  name: string;
  email: string;
  country: string;
  organizationName: string;
  manufacturerId: string;
  password: string;
  role: string;
  status: string;
}) {
  const user = await UserModel.create({
    Country: input.country,
    CreatedAt: new Date(),
    Email: input.email,
    ManufacturerID: input.manufacturerId,
    Name: input.name,
    OrganizationName: input.organizationName,
    Password: input.password,
    Role: input.role,
    Status: input.status
  });

  return toUserDto(user.toObject());
}

export async function updateUser(id: string, updates: Partial<{
  name: string;
  email: string;
  country: string;
  organizationName: string;
  manufacturerId: string;
  password: string;
  role: string;
  status: string;
}>) {
  const user = await UserModel.findByIdAndUpdate(
    id,
    {
      ...(updates.name ? { Name: updates.name } : {}),
      ...(updates.email ? { Email: updates.email } : {}),
      ...(updates.country ? { Country: updates.country } : {}),
      ...(updates.organizationName ? { OrganizationName: updates.organizationName } : {}),
      ...(updates.manufacturerId ? { ManufacturerID: updates.manufacturerId } : {}),
      ...(updates.password ? { Password: updates.password } : {}),
      ...(updates.role ? { Role: updates.role } : {}),
      ...(updates.status ? { Status: updates.status } : {})
    },
    { new: true }
  ).lean();

  return user ? toUserDto(user) : null;
}

export async function updateUserById(id: string, updates: Record<string, any>) {
  return UserModel.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
}

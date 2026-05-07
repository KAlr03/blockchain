import type { UserDto } from "@halal/shared";

export function toUserDto(document: Record<string, unknown>): UserDto {
  return {
    id: String(document._id),
    name: String(document.Name),
    email: String(document.Email),
    country: String(document.Country),
    organizationName: String(document.OrganizationName),
    manufacturerId: String(document.ManufacturerID),
    role: String(document.Role) as UserDto["role"],
    status: String(document.Status),
    createdAt: new Date(document.CreatedAt as string | Date).toISOString()
  };
}

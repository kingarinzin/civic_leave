import Role from "@/models/Role";

export async function getUserPermissions(user: any): Promise<string[]> {
  if (user.isAdmin) return ["*"]; // Super Admin bypass

  let permissions: string[] = [];
  
  if (user.assignedRoleId) {
    const role = await Role.findById(user.assignedRoleId);
    if (role && role.permissions) {
      permissions = [...role.permissions];
    }
  }
  
  return permissions;
}

export function hasPermission(userPermissions: string[], requiredKey: string): boolean {
  if (userPermissions.includes("*")) return true;
  return userPermissions.includes(requiredKey);
}
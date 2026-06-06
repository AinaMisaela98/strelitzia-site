import { prisma } from "@/lib/prisma";

export async function hasPermission(
  role: string,
  module: string,
  action: string
) {
  if (role === "ADMIN") return true;

  const permission = await prisma.permissionSetting.findUnique({
    where: {
      role_module_action: {
        role,
        module,
        action,
      },
    },
  });

  return permission?.allowed === true;
}
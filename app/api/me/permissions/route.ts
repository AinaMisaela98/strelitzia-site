import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (user.role === "ADMIN") {
    return NextResponse.json({
      success: true,
      role: user.role,
      isAdmin: true,
      permissions: [],
    });
  }

  const permissions = await prisma.permissionSetting.findMany({
    where: {
      role: user.role,
      allowed: true,
    },
  });

  return NextResponse.json({
    success: true,
    role: user.role,
    isAdmin: false,
    permissions,
  });
}
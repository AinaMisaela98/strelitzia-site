import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();

  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const permissions = await prisma.permissionSetting.findMany({
    orderBy: [{ role: "asc" }, { module: "asc" }, { action: "asc" }],
  });

  return NextResponse.json({ success: true, permissions });
}

export async function POST(req: Request) {
  const user = await getAuthUser();

  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { role, module, action, allowed } = await req.json();

  if (!role || !module || !action) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const permission = await prisma.permissionSetting.upsert({
    where: {
      role_module_action: {
        role,
        module,
        action,
      },
    },
    update: {
      allowed: Boolean(allowed),
    },
    create: {
      role,
      module,
      action,
      allowed: Boolean(allowed),
    },
  });

  return NextResponse.json({ success: true, permission });
}
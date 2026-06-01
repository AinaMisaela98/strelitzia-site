import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeRoleName(value: string) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

async function getId(context: any) {
  const params = await context.params;
  const id = Number(params?.id);

  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("ID rôle invalide");
  }

  return id;
}

export async function PATCH(req: Request, context: any) {
  try {
    const id = await getId(context);
    const body = await req.json();

    const role = await prisma.userRole.update({
      where: { id },
      data: {
        name: body.name ? normalizeRoleName(body.name) : undefined,
        label: body.label ? String(body.label).trim() : undefined,
        description:
          body.description !== undefined
            ? String(body.description).trim()
            : undefined,
        active:
          body.active !== undefined ? Boolean(body.active) : undefined,
      },
    });

    return NextResponse.json({ role });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur modification rôle" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, context: any) {
  try {
    const id = await getId(context);

    const role = await prisma.userRole.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ role });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur suppression rôle" },
      { status: 500 }
    );
  }
}
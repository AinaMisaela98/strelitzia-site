import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeRoleName(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

export async function GET() {
  const roles = await prisma.userRole.findMany({
  orderBy: { createdAt: "asc" },
});

  return NextResponse.json({ roles });
}

export async function POST(req: Request) {
  const body = await req.json();

  const name = normalizeRoleName(body.name || body.label || "");
  const label = String(body.label || body.name || "").trim();
  const description = String(body.description || "").trim();

  if (!name || !label) {
    return NextResponse.json(
      { error: "Nom et libellé obligatoires." },
      { status: 400 }
    );
  }

  const role = await prisma.userRole.create({
    data: {
      name,
      label,
      description: description || null,
      active: true,
    },
  });

  return NextResponse.json({ role });
}
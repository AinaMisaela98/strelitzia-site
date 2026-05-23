import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const years = await prisma.schoolYear.findMany({
    orderBy: { id: "desc" },
  });

  return NextResponse.json(years);
}

export async function POST(req: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();

  if (!body.name) {
    return NextResponse.json(
      { error: "Nom année scolaire obligatoire" },
      { status: 400 }
    );
  }

  const year = await prisma.schoolYear.create({
    data: {
      name: body.name,
      active: false,
    },
  });

  return NextResponse.json(year);
}
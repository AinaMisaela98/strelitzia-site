import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

async function getActiveYear() {
  let year = await prisma.schoolYear.findFirst({
    where: { active: true },
  });

  if (!year) {
    year = await prisma.schoolYear.create({
      data: { name: "2025-2026", active: true },
    });
  }

  return year.name;
}

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const url = new URL(req.url);
  const year = url.searchParams.get("year") || (await getActiveYear());

  const levels = await prisma.level.findMany({
    where: { schoolYearName: year },
    include: {
      classes: {
        include: { series: true },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ year, levels });
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const year = body.schoolYearName || (await getActiveYear());

    if (!body.name || !body.type) {
      return NextResponse.json({ error: "Champs incomplets" }, { status: 400 });
    }

    if (body.type === "level") {
      const item = await prisma.level.create({
        data: {
          name: body.name,
          schoolYearName: year,
        },
      });

      return NextResponse.json(item);
    }

    if (body.type === "class") {
      if (!body.levelId) {
        return NextResponse.json({ error: "Niveau obligatoire" }, { status: 400 });
      }

      const item = await prisma.classRoom.create({
        data: {
          name: body.name,
          levelId: Number(body.levelId),
          schoolYearName: year,
        },
      });

      return NextResponse.json(item);
    }

    if (body.type === "serie") {
      if (!body.classRoomId) {
        return NextResponse.json({ error: "Classe obligatoire" }, { status: 400 });
      }

      const item = await prisma.serie.create({
        data: {
          name: body.name,
          classRoomId: Number(body.classRoomId),
          schoolYearName: year,
        },
      });

      return NextResponse.json(item);
    }

    return NextResponse.json({ error: "Type invalide" }, { status: 400 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Existe déjà pour cette année scolaire" }, { status: 400 });
    }

    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const models = await prisma.feeModel.findMany({
      where: q
        ? {
            OR: [
              { title: { contains: q } },
              { schoolYearName: { contains: q } },
            ],
          }
        : {},
      include: {
        tariffs: {
          include: {
            specials: {
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(models);
  } catch (error) {
    console.error("GET /api/fee-models:", error);
    return NextResponse.json(
      { message: "Erreur chargement modèles de frais." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title = clean(body.title);
    const schoolYearName = clean(body.schoolYearName);
    const classe = clean(body.classe) || "GENERAL";

    if (!title || !schoolYearName) {
      return NextResponse.json(
        { message: "Titre et année scolaire obligatoires." },
        { status: 400 }
      );
    }

    const exists = await prisma.feeModel.findFirst({
      where: {
        title,
        schoolYearName,
        classe,
      },
    });

    if (exists) {
      return NextResponse.json(
        { message: "Ce modèle existe déjà pour cette année scolaire." },
        { status: 409 }
      );
    }

    const model = await prisma.feeModel.create({
      data: {
        title,
        schoolYearName,
        classe,
      },
      include: {
        tariffs: {
          include: {
            specials: true,
          },
        },
      },
    });

    return NextResponse.json(model);
  } catch (error) {
    console.error("POST /api/fee-models:", error);
    return NextResponse.json(
      { message: "Erreur création modèle de frais." },
      { status: 500 }
    );
  }
}
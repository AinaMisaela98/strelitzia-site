import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const model = await prisma.feeModel.findUnique({
      where: { id: Number(id) },
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
    });

    if (!model) {
      return NextResponse.json(
        { message: "Modèle introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json(model);
  } catch (error) {
    console.error("GET /api/fee-models/[id]:", error);
    return NextResponse.json(
      { message: "Erreur chargement modèle." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const model = await prisma.feeModel.update({
      where: { id: Number(id) },
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
    console.error("PUT /api/fee-models/[id]:", error);
    return NextResponse.json(
      { message: "Erreur modification modèle." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.feeModel.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "Modèle supprimé." });
  } catch (error) {
    console.error("DELETE /api/fee-models/[id]:", error);
    return NextResponse.json(
      { message: "Erreur suppression modèle." },
      { status: 500 }
    );
  }
}
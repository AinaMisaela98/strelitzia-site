import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toAmount(value: unknown) {
  const n = Number(String(value || "0").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const libelle = clean(body.libelle);
    const code = clean(body.code);
    const montant = toAmount(body.montant);

    if (!libelle || !code || montant <= 0) {
      return NextResponse.json(
        { message: "Libellé, code et montant obligatoires." },
        { status: 400 }
      );
    }

    const tariff = await prisma.feeTariff.update({
      where: { id: Number(id) },
      data: { libelle, code, montant },
      include: { specials: true },
    });

    return NextResponse.json(tariff);
  } catch (error) {
    console.error("PUT /api/fee-tariffs/[id]:", error);
    return NextResponse.json(
      { message: "Erreur modification tarif." },
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

    await prisma.feeTariff.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "Tarif supprimé." });
  } catch (error) {
    console.error("DELETE /api/fee-tariffs/[id]:", error);
    return NextResponse.json(
      { message: "Erreur suppression tarif." },
      { status: 500 }
    );
  }
}
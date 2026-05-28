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

    const name = clean(body.name);
    const amount = toAmount(body.amount);

    if (!name || amount <= 0) {
      return NextResponse.json(
        { message: "Nom et montant obligatoires." },
        { status: 400 }
      );
    }

    const special = await prisma.feeSpecialTariff.update({
      where: { id: Number(id) },
      data: { name, amount },
    });

    return NextResponse.json(special);
  } catch (error) {
    console.error("PUT /api/fee-special-tariffs/[id]:", error);
    return NextResponse.json(
      { message: "Erreur modification tarif spécial." },
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

    await prisma.feeSpecialTariff.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "Tarif spécial supprimé." });
  } catch (error) {
    console.error("DELETE /api/fee-special-tariffs/[id]:", error);
    return NextResponse.json(
      { message: "Erreur suppression tarif spécial." },
      { status: 500 }
    );
  }
}
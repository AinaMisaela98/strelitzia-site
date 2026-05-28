import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toAmount(value: unknown) {
  const n = Number(String(value || "0").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const feeModelId = Number(body.feeModelId);
    const libelle = clean(body.libelle);
    const code = clean(body.code);
    const montant = toAmount(body.montant);

    if (!feeModelId || !libelle || !code || montant <= 0) {
      return NextResponse.json(
        { message: "Libellé, code et montant obligatoires." },
        { status: 400 }
      );
    }

    const tariff = await prisma.feeTariff.create({
      data: {
        feeModelId,
        libelle,
        code,
        montant,
      },
      include: {
        specials: true,
      },
    });

    return NextResponse.json(tariff);
  } catch (error) {
    console.error("POST /api/fee-tariffs:", error);
    return NextResponse.json(
      { message: "Erreur ajout tarif." },
      { status: 500 }
    );
  }
}
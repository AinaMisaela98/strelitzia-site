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

    const feeTariffId = Number(body.feeTariffId);
    const name = clean(body.name);
    const amount = toAmount(body.amount);

    if (!feeTariffId || !name || amount <= 0) {
      return NextResponse.json(
        { message: "Nom tarif spécial et montant obligatoires." },
        { status: 400 }
      );
    }

    const existing = await prisma.feeSpecialTariff.findFirst({
      where: {
        feeTariffId,
        name,
      },
    });

    if (existing) {
      const updated = await prisma.feeSpecialTariff.update({
        where: { id: existing.id },
        data: { amount },
      });

      return NextResponse.json(updated);
    }

    const special = await prisma.feeSpecialTariff.create({
      data: {
        feeTariffId,
        name,
        amount,
      },
    });

    return NextResponse.json(special);
  } catch (error) {
    console.error("POST /api/fee-special-tariffs:", error);
    return NextResponse.json(
      { message: "Erreur ajout tarif spécial." },
      { status: 500 }
    );
  }
}
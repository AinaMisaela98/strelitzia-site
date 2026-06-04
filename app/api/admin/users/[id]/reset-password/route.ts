import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = Number(id);

    if (!userId) {
      return NextResponse.json({ error: "ID utilisateur invalide" }, { status: 400 });
    }

    const defaultPassword = "123456";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
      },
    });

    return NextResponse.json({
      success: true,
      password: defaultPassword,
      user,
      message: "Mot de passe réinitialisé : 123456",
    });
  } catch (error) {
    console.error("ADMIN_RESET_PASSWORD_ERROR", error);
    return NextResponse.json(
      { error: "Erreur réinitialisation mot de passe" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

function getCookieValue(cookieHeader: string | null, names: string[]) {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((item) => item.trim());
  for (const name of names) {
    const found = cookies.find((cookie) => cookie.startsWith(`${name}=`));
    if (found) return decodeURIComponent(found.slice(name.length + 1));
  }

  return null;
}

export async function POST(req: Request) {
  try {
    if (!process.env.JWT_SECRET) {
      return NextResponse.json({ error: "JWT_SECRET manquant" }, { status: 500 });
    }

    const token = getCookieValue(req.headers.get("cookie"), [
      "token",
      "auth_token",
      "authToken",
      "strelitzia_token",
    ]);

    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      id?: number;
      userId?: number;
      email?: string;
    };

    const userId = Number(decoded.id || decoded.userId);

    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const body = await req.json();
    const oldPassword = String(body.oldPassword || "");
    const newPassword = String(body.newPassword || "");

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Le nouveau mot de passe doit contenir au moins 6 caractères" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const mustChangePassword = Boolean((user as any).mustChangePassword);

    if (!mustChangePassword) {
      const isSame = await bcrypt.compare(oldPassword, user.password);
      if (!isSame) {
        return NextResponse.json(
          { error: "Ancien mot de passe incorrect" },
          { status: 400 },
        );
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Mot de passe modifié avec succès",
    });
  } catch (error) {
    console.error("CHANGE_PASSWORD_ERROR", error);
    return NextResponse.json(
      { error: "Erreur modification mot de passe" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
      return NextResponse.json(
        { error: "JWT_SECRET manquant" },
        { status: 500 }
      );
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
      id?: number | string;
      userId?: number | string;
    };

    const userId = Number(decoded.id || decoded.userId);

    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Aucune photo reçue" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Le fichier doit être une image" },
        { status: 400 }
      );
    }

    // Base64 ao amin'ny DB: aza atao lehibe loatra.
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Photo trop lourde. Maximum 2 Mo." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Vercel dia read-only filesystem, ka tsy manoratra fichier ao public/uploads intsony.
    // Tehirizina mivantana ao amin'ny User.profilePhoto ny image base64.
    const profilePhoto = `data:${file.type};base64,${buffer.toString("base64")}`;

    await prisma.user.update({
      where: { id: userId },
      data: { profilePhoto },
    });

    return NextResponse.json({
      success: true,
      profilePhoto,
      message: "Photo de profil mise à jour",
    });
  } catch (error) {
    console.error("PROFILE_PHOTO_ERROR", error);
    return NextResponse.json(
      { error: "Erreur upload photo de profil" },
      { status: 500 }
    );
  }
}

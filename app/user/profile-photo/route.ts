import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

function readCookie(req: Request, names: string[]) {
  const cookie = req.headers.get("cookie") || "";
  for (const name of names) {
    const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    if (match?.[1]) return decodeURIComponent(match[1]);
  }
  return "";
}

function getUserIdFromRequest(req: Request) {
  const token = readCookie(req, ["token", "authToken", "auth-token", "strelitzia_token"]);

  if (!token || !process.env.JWT_SECRET) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      id?: number | string;
      userId?: number | string;
    };

    const id = Number(decoded.id || decoded.userId);
    return id && !Number.isNaN(id) ? id : null;
  } catch {
    return null;
  }
}

function formatUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleLabel: user.roleRef?.label || user.roleLabel || user.role,
    profilePhoto: user.profilePhoto || null,
    active: user.active,
  };
}

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const formData = await req.formData();
    const action = String(formData.get("action") || "upload");
    const file = formData.get("photo") as File | null;

    if (action === "delete") {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { profilePhoto: null },
        include: { roleRef: true },
      });

      return NextResponse.json({
        success: true,
        profilePhoto: null,
        user: formatUser(user),
        message: "Photo de profil supprimée",
      });
    }

    if (!file) {
      return NextResponse.json({ error: "Aucune photo reçue" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Le fichier doit être une image" },
        { status: 400 },
      );
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Photo trop lourde. Maximum 2 Mo." },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const profilePhoto = `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}`;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { profilePhoto },
      include: { roleRef: true },
    });

    return NextResponse.json({
      success: true,
      profilePhoto,
      user: formatUser(user),
      message: "Photo de profil mise à jour",
    });
  } catch (error) {
    console.error("USER_PROFILE_PHOTO_ERROR", error);
    return NextResponse.json(
      { error: "Erreur photo profil" },
      { status: 500 },
    );
  }
}

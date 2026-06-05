import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roleRef: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    return NextResponse.json({ user: formatUser(user) });
  } catch (error) {
    console.error("USER_PROFILE_GET_ERROR", error);
    return NextResponse.json({ error: "Erreur chargement profil" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();

    const name = String(body?.name || "").trim();
    const profilePhoto =
      typeof body?.profilePhoto === "string"
        ? body.profilePhoto.trim()
        : undefined;

    if (!name) {
      return NextResponse.json({ error: "Nom obligatoire" }, { status: 400 });
    }

    const data: any = { name };

    if (profilePhoto !== undefined) {
      // Base64 accepté, pas d'upload fichier dans public sur Vercel
      if (profilePhoto && !profilePhoto.startsWith("data:image/")) {
        return NextResponse.json(
          { error: "Format photo invalide" },
          { status: 400 }
        );
      }

      data.profilePhoto = profilePhoto || null;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      include: { roleRef: true },
    });

    return NextResponse.json({
      success: true,
      user: formatUser(user),
    });
  } catch (error) {
    console.error("USER_PROFILE_PATCH_ERROR", error);
    return NextResponse.json(
      { error: "Erreur modification profil" },
      { status: 500 }
    );
  }
}
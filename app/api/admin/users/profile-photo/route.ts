import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const userId = Number(formData.get("userId"));
    const action = String(formData.get("action") || "upload");
    const file = formData.get("photo") as File | null;

    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json(
        { error: "Utilisateur invalide" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 },
      );
    }

    if (action === "delete") {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { profilePhoto: null },
        include: { roleRef: true },
      });

      return NextResponse.json({
        success: true,
        profilePhoto: null,
        user,
        message: "Photo de profil supprimée",
      });
    }

    if (!file) {
      return NextResponse.json(
        { error: "Aucune photo reçue" },
        { status: 400 },
      );
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
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const profilePhoto = `data:${file.type};base64,${base64}`;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { profilePhoto },
      include: { roleRef: true },
    });

    return NextResponse.json({
      success: true,
      profilePhoto,
      user,
      message: "Photo de profil mise à jour",
    });
  } catch (error) {
    console.error("ADMIN_PROFILE_PHOTO_ERROR", error);
    return NextResponse.json(
      { error: "Erreur upload photo profil" },
      { status: 500 },
    );
  }
}
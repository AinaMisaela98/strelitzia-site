import { NextResponse } from "next/server";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const userId = Number(formData.get("userId"));
    const file = formData.get("photo") as File | null;
    const action = String(formData.get("action") || "upload");

    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json(
        { error: "Utilisateur invalide" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, profilePhoto: true },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 },
      );
    }

    if (action === "delete") {
      if (existingUser.profilePhoto?.startsWith("/uploads/profiles/")) {
        const oldPath = path.join(
          process.cwd(),
          "public",
          existingUser.profilePhoto,
        );

        await unlink(oldPath).catch(() => {});
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { profilePhoto: null },
        include: { roleRef: true },
      });

      return NextResponse.json({
        success: true,
        profilePhoto: null,
        user,
        message: "Photo de profil supprimée avec succès",
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

    if (file.size > 3 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Photo trop lourde. Maximum 3 Mo." },
        { status: 400 },
      );
    }

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "profiles",
    );

    await mkdir(uploadDir, { recursive: true });

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)
      ? ext
      : "jpg";

    const filename = `user-${userId}-${Date.now()}.${safeExt}`;
    const filepath = path.join(uploadDir, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    const profilePhoto = `/uploads/profiles/${filename}`;

    if (existingUser.profilePhoto?.startsWith("/uploads/profiles/")) {
      const oldPath = path.join(
        process.cwd(),
        "public",
        existingUser.profilePhoto,
      );

      await unlink(oldPath).catch(() => {});
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { profilePhoto },
      include: { roleRef: true },
    });

    return NextResponse.json({
      success: true,
      profilePhoto,
      user,
      message: "Photo de profil mise à jour avec succès",
    });
  } catch (error) {
    console.error("ADMIN_PROFILE_PHOTO_ERROR", error);
    return NextResponse.json(
      { error: "Erreur upload photo profil" },
      { status: 500 },
    );
  }
}